import { NextResponse } from "next/server";
import type { DieselMonthlyPoint } from "@/types/indicator";

type CneDieselApiPoint = {
  fecha?: string;
  anio?: number;
  mes?: number;
  region_nombre?: string;
  region_cod?: number | string;
  tipo_combustible?: string;
  precio_por_litro?: string | number;
};

type CneDieselApiResponse = {
  success?: boolean;
  data?: CneDieselApiPoint[];
  total?: number;
  status?: string;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeDieselType(value: string | undefined) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function buildMonthlySeries(data: CneDieselApiPoint[]) {
  const monthlyMap = new Map<string, { year: number; month: number; date: string; prices: number[] }>();

  for (const point of data) {
    const fuelType = normalizeDieselType(point.tipo_combustible);

    if (!fuelType.includes("diesel")) {
      continue;
    }

    const year = Number(point.anio);
    const month = Number(point.mes);
    const price = Number(point.precio_por_litro);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(price)) {
      continue;
    }

    const date = point.fecha ?? new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const current = monthlyMap.get(key);

    if (!current) {
      monthlyMap.set(key, { year, month, date, prices: [price] });
      continue;
    }

    current.prices.push(price);
  }

  const series: DieselMonthlyPoint[] = Array.from(monthlyMap.values())
    .map((entry) => ({
      date: entry.date,
      year: entry.year,
      month: entry.month,
      price: Math.round(average(entry.prices) * 100) / 100,
    }))
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  return series;
}

export async function GET() {
  const token = process.env.CNE_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        code: "missing_token",
        message: "Missing CNE_API_TOKEN. Configure a valid Bearer token to load historical diesel data.",
        hint: "Create .env.local with CNE_API_TOKEN=tu_token_bearer y reinicia npm run dev.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.cne.cl/api/ea/precio/combustibleliquido", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 60 * 60 * 12 },
    });

    const payload = (await response.json()) as CneDieselApiResponse;

    if (!response.ok || payload.success === false) {
      return NextResponse.json(
        {
          success: false,
          code: "upstream_auth_or_data_error",
          message: payload.status ?? "CNE API request failed",
          status: response.status,
          hint: "Verifica que CNE_API_TOKEN sea un bearer valido y que tenga acceso al recurso de combustibles liquidos.",
        },
        { status: 502 },
      );
    }

    const series = buildMonthlySeries(payload.data ?? []);

    if (series.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: "empty_series",
          message: "CNE API responded but no diesel monthly points could be normalized.",
          hint: "Revisa si la API CNE cambio la estructura de campos como tipo_combustible, anio, mes o precio_por_litro.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      source: "CNE API",
      points: series,
      lastUpdated: series.at(-1)?.date ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        code: "unexpected_error",
        message: error instanceof Error ? error.message : "Unknown diesel history error",
        hint: "Revisa conectividad, validez del token y formato de respuesta de la API CNE.",
      },
      { status: 500 },
    );
  }
}
