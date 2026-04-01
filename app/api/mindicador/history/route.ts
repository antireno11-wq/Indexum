import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type MindicadorSeriePoint = {
  fecha: string;
  valor: number;
};

type MindicadorResponse = {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  serie: MindicadorSeriePoint[];
};

type SourceMode = "live" | "cache" | "mixed";

const VALID_SERIES = new Set(["dolar", "uf"]);

function getCacheFilePath(series: string, year: number) {
  return path.join(process.cwd(), "uf_pipeline", "data", "raw", `${series}_years`, `${year}.json`);
}

async function readCachedYear(series: string, year: number) {
  const filePath = getCacheFilePath(series, year);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as MindicadorResponse;
}

async function writeCachedYear(series: string, year: number, payload: MindicadorResponse) {
  const filePath = getCacheFilePath(series, year);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

async function fetchLiveYear(series: string, year: number) {
  const response = await fetch(`https://mindicador.cl/api/${series}/${year}`, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "User-Agent": "Mozilla/5.0 Codex Local Demo",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`mindicador.cl responded with ${response.status} for ${series} ${year}`);
  }

  return (await response.json()) as MindicadorResponse;
}

async function loadYear(series: string, year: number) {
  try {
    const livePayload = await fetchLiveYear(series, year);
    await writeCachedYear(series, year, livePayload);
    return { payload: livePayload, source: "live" as const };
  } catch (liveError) {
    try {
      const cachedPayload = await readCachedYear(series, year);
      return { payload: cachedPayload, source: "cache" as const };
    } catch {
      throw new Error(
        `No fue posible cargar ${series} ${year} desde mindicador.cl ni desde cache local. Detalle live: ${
          liveError instanceof Error ? liveError.message : String(liveError)
        }`,
      );
    }
  }
}

function detectSourceMode(sources: Array<"live" | "cache">): SourceMode {
  const hasLive = sources.includes("live");
  const hasCache = sources.includes("cache");

  if (hasLive && hasCache) {
    return "mixed";
  }

  return hasLive ? "live" : "cache";
}

export async function GET(request: NextRequest) {
  const series = request.nextUrl.searchParams.get("series") ?? "";
  const yearsParam = request.nextUrl.searchParams.get("years") ?? "";

  if (!VALID_SERIES.has(series)) {
    return NextResponse.json(
      {
        success: false,
        code: "invalid_series",
        message: "Query param 'series' must be one of: dolar, uf.",
      },
      { status: 400 },
    );
  }

  const years = yearsParam
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 1990);

  if (years.length === 0) {
    return NextResponse.json(
      {
        success: false,
        code: "invalid_years",
        message: "Query param 'years' must include at least one valid year.",
      },
      { status: 400 },
    );
  }

  try {
    const results = await Promise.all(years.map((year) => loadYear(series, year)));
    const mergedSeries = results
      .flatMap((result) => result.payload.serie)
      .sort((left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime());
    const sourceMode = detectSourceMode(results.map((result) => result.source));
    const lastUpdated = mergedSeries.at(-1)?.fecha ?? null;

    return NextResponse.json({
      success: true,
      series,
      sourceMode,
      provider: sourceMode === "cache" ? "Cache local de mindicador.cl" : "mindicador.cl",
      lastUpdated,
      points: mergedSeries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "history_unavailable",
        message: error instanceof Error ? error.message : "Unable to load indicator history.",
      },
      { status: 502 },
    );
  }
}
