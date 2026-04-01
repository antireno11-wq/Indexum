import type { IndicatorDefinition, IndicatorPoint } from "@/types/indicator";
import { buildForecastPoints, buildProjectionAssumptions } from "@/utils/indicator";
import { formatCurrency, formatPercent } from "@/utils/format";

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

type MindicadorHistoryApiResponse = {
  success: boolean;
  series: "dolar" | "uf";
  sourceMode: "live" | "cache" | "mixed";
  provider: string;
  lastUpdated: string | null;
  points: MindicadorSeriePoint[];
  message?: string;
};

function getMonthKey(date: string) {
  const parsed = new Date(date);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function mapMonthlyHistory(series: MindicadorSeriePoint[], months = 60): IndicatorPoint[] {
  const sorted = [...series].sort((left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime());
  const monthly = new Map<string, MindicadorSeriePoint>();

  for (const point of sorted) {
    monthly.set(getMonthKey(point.fecha), point);
  }

  return Array.from(monthly.values())
    .slice(-months)
    .map((point) => ({
      date: point.fecha,
      real: point.valor,
      base: null,
      optimistic: null,
      stress: null,
    }));
}

async function fetchMindicadorHistory(seriesCode: "dolar" | "uf", years: number[]) {
  const response = await fetch(`/api/mindicador/history?series=${seriesCode}&years=${years.join(",")}`);

  if (!response.ok) {
    throw new Error(`Local history API responded with ${response.status} for ${seriesCode}`);
  }

  const payload = (await response.json()) as MindicadorHistoryApiResponse;

  if (!payload.success) {
    throw new Error(payload.message ?? `Unable to load ${seriesCode} history`);
  }

  return payload;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getMonthlyVariation(points: IndicatorPoint[]) {
  const current = points.at(-1)?.real ?? 0;
  const previous = points.at(-2)?.real ?? current;

  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

function getYearlyVariation(points: IndicatorPoint[]) {
  const current = points.at(-1)?.real ?? 0;
  const previousYear = points.at(-13)?.real ?? points.at(0)?.real ?? current;

  if (previousYear === 0) {
    return 0;
  }

  return ((current - previousYear) / previousYear) * 100;
}

function getRange(points: IndicatorPoint[], months: number) {
  const values = points.slice(-months).map((point) => point.real ?? 0);

  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function buildUfAssumptions(points: IndicatorPoint[], digits = 2) {
  const values = points.map((point) => point.real ?? 0);
  const average12 = average(values.slice(-12));
  const monthlyVariation = getMonthlyVariation(points);
  const yearlyVariation = getYearlyVariation(points);
  const range12 = getRange(points, 12);

  return [
    {
      key: "inflation-pass-through",
      label: "Inflacion incorporada",
      value: `${yearlyVariation >= 0 ? "+" : ""}${yearlyVariation.toFixed(1)}% anual`,
      impact:
        "La UF recoge el ajuste acumulado de inflacion, por lo que su deriva anual ayuda a dimensionar el ritmo de reajuste que ya viene absorbiendo contratos y tarifas indexadas.",
    },
    {
      key: "recent-trend",
      label: "Tendencia reciente",
      value: `${monthlyVariation >= 0 ? "+" : ""}${monthlyVariation.toFixed(1)}% mensual`,
      impact:
        "El ultimo cambio mensual muestra si la UF sigue avanzando de forma ordenada o si la pendiente reciente empieza a moderarse respecto de los meses previos.",
    },
    {
      key: "average-level",
      label: "Promedio 12 meses",
      value: formatCurrency(average12, digits),
      impact:
        "El promedio del ultimo ano sirve como referencia ejecutiva para comparar el nivel actual con una base reciente mas estable y menos sensible a un solo corte mensual.",
    },
    {
      key: "range-12m",
      label: "Rango 12 meses",
      value: formatCurrency(range12, digits),
      impact:
        "El rango observado del ultimo ano permite ver cuan abierta ha estado la banda de ajuste de la UF y si el indicador se ha movido dentro de una trayectoria predecible.",
    },
  ];
}

export async function hydrateUsdClpFromMindicador(
  baseIndicator: IndicatorDefinition,
): Promise<IndicatorDefinition> {
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  const response = await fetchMindicadorHistory("dolar", years);
  const mergedSeries = response.points;
  const historicalPoints = mapMonthlyHistory(mergedSeries, 60);

  if (historicalPoints.length === 0) {
    throw new Error("mindicador.cl did not return historical USD/CLP points");
  }

  const latestObserved = historicalPoints.at(-1);

  if (!latestObserved?.real) {
    throw new Error("Unable to determine latest observed USD/CLP value");
  }

  const forecastPoints = buildForecastPoints(historicalPoints, 60, baseIndicator.macroSeries ?? []);
  const assumptions = buildProjectionAssumptions(historicalPoints, baseIndicator.macroSeries ?? []);

  return {
    ...baseIndicator,
    methodologyNote:
      "Historico y valor actual observados desde mindicador.cl. El forecast mensual combina serie real con variables explicativas macro: DXY, cobre, diferencial de tasas Chile-EE.UU., diferencial de inflacion, VIX, riesgo Chile y precio del petroleo.",
    assumptions,
    points: [...historicalPoints, ...forecastPoints],
    dataSource: {
      provider: response.provider,
      mode: response.sourceMode === "live" ? "live" : "hybrid",
      lastUpdated: response.lastUpdated ?? latestObserved.date,
      note:
        response.sourceMode === "cache"
          ? "Valor actual e historico mensual de USD/CLP servidos desde cache local validado, porque la fuente externa no respondio en tiempo real. El forecast usa ademas un set macro interpretable para abrir escenarios."
          : response.sourceMode === "mixed"
            ? "Valor actual e historico mensual de USD/CLP servidos con una mezcla de datos en vivo y cache local, segun disponibilidad de la fuente externa. El forecast usa ademas un set macro interpretable para abrir escenarios."
            : "Valor actual e historico mensual de USD/CLP obtenidos desde mindicador.cl. El forecast usa ademas un set macro interpretable para abrir escenarios.",
    },
  };
}

export async function hydrateUfFromMindicador(baseIndicator: IndicatorDefinition): Promise<IndicatorDefinition> {
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  const response = await fetchMindicadorHistory("uf", years);
  const mergedSeries = response.points;
  const historicalPoints = mapMonthlyHistory(mergedSeries, 60);

  if (historicalPoints.length === 0) {
    throw new Error("mindicador.cl did not return historical UF points");
  }

  const latestObserved = historicalPoints.at(-1);

  if (!latestObserved?.real) {
    throw new Error("Unable to determine latest observed UF value");
  }

  const forecastPoints = buildForecastPoints(historicalPoints, 60);
  const assumptions = buildUfAssumptions(historicalPoints, baseIndicator.displayDecimals ?? 2);
  const yearlyVariation = getYearlyVariation(historicalPoints);

  return {
    ...baseIndicator,
    methodologyNote:
      "Historico y valor actual observados desde mindicador.cl. La continuidad mensual proyectada se deriva desde la serie real de UF, privilegiando una lectura simple e interpretable para reajustes y contratos indexados.",
    assumptions,
    points: [...historicalPoints, ...forecastPoints],
    dataSource: {
      provider: response.provider,
      mode: response.sourceMode === "live" ? "live" : "hybrid",
      lastUpdated: response.lastUpdated ?? latestObserved.date,
      note:
        response.sourceMode === "cache"
          ? `Valor actual e historico mensual de UF servidos desde cache local validado, porque la fuente externa no respondio en tiempo real. La continuidad proyectada se construye sobre la pendiente observada, con una variacion anual reciente de ${yearlyVariation >= 0 ? "+" : ""}${formatPercent(yearlyVariation)}.`
          : response.sourceMode === "mixed"
            ? `Valor actual e historico mensual de UF servidos con mezcla de datos en vivo y cache local, segun disponibilidad de la fuente externa. La continuidad proyectada se construye sobre la pendiente observada, con una variacion anual reciente de ${yearlyVariation >= 0 ? "+" : ""}${formatPercent(yearlyVariation)}.`
            : `Valor actual e historico mensual de UF obtenidos desde mindicador.cl. La continuidad proyectada se construye sobre la pendiente observada, con una variacion anual reciente de ${yearlyVariation >= 0 ? "+" : ""}${formatPercent(yearlyVariation)}.`,
    },
  };
}

export async function hydrateIndicatorFromMindicador(
  baseIndicator: IndicatorDefinition,
): Promise<IndicatorDefinition> {
  if (baseIndicator.slug === "usd-clp") {
    return hydrateUsdClpFromMindicador(baseIndicator);
  }

  if (baseIndicator.slug === "uf-cl") {
    return hydrateUfFromMindicador(baseIndicator);
  }

  throw new Error(`No mindicador integration configured for ${baseIndicator.slug}`);
}
