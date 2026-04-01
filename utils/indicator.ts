import type {
  ExecutiveSummary,
  HorizonOption,
  IndicatorAssumption,
  IndicatorDefinition,
  IndicatorMacroPoint,
  IndicatorPoint,
} from "@/types/indicator";
import { formatCurrency, formatMonthLong } from "@/utils/format";

export type DisplayPoint = IndicatorPoint & {
  label: string;
  monthLong: string;
  isForecast: boolean;
  displayValue: number;
};

type ProjectionInputs = {
  latestValue: number;
  mean12: number;
  recentMomentum: number;
  mediumMomentum: number;
  longMomentum: number;
  volatility12: number;
  baseDrift: number;
  spreadDrift: number;
  latestMacro: IndicatorMacroPoint | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function getHistoricalPoints(points: IndicatorPoint[]) {
  return points.filter((point) => point.real !== null);
}

function getForecastPoints(points: IndicatorPoint[]) {
  return points.filter((point) => point.real === null && point.base !== null);
}

function getMonthlyChanges(points: IndicatorPoint[]) {
  const historical = getHistoricalPoints(points);
  const changes: number[] = [];

  for (let index = 1; index < historical.length; index += 1) {
    const current = historical[index].real ?? 0;
    const previous = historical[index - 1].real ?? current;

    if (previous !== 0) {
      changes.push((current - previous) / previous);
    }
  }

  return changes;
}

export function addMonths(date: string | Date, months: number) {
  const baseDate = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + months, baseDate.getUTCDate()));
}

function buildProjectionInputs(points: IndicatorPoint[]): ProjectionInputs | null {
  const historical = getHistoricalPoints(points);

  if (historical.length < 12) {
    return null;
  }

  const changes = getMonthlyChanges(historical);
  const recentMomentum = average(changes.slice(-3));
  const mediumMomentum = average(changes.slice(-6));
  const longMomentum = average(changes.slice(-12));
  const volatility12 = standardDeviation(changes.slice(-12));
  const mean12 = average(historical.slice(-12).map((point) => point.real ?? 0));
  const latestValue = historical.at(-1)?.real ?? mean12;

  const baseDrift = clamp(recentMomentum * 0.45 + mediumMomentum * 0.35 + longMomentum * 0.2, -0.012, 0.012);
  const spreadDrift = clamp(volatility12 * 0.75, 0.0025, 0.013);

  return {
    latestValue,
    mean12,
    recentMomentum,
    mediumMomentum,
    longMomentum,
    volatility12,
    baseDrift,
    spreadDrift,
    latestMacro: null,
  };
}

function getLatestMacroPoint(macroSeries: IndicatorMacroPoint[]) {
  return macroSeries.at(-1) ?? null;
}

function buildMacroSignal(latestMacro: IndicatorMacroPoint | null) {
  if (!latestMacro) {
    return {
      score: 0,
      spreadAdjustment: 0,
    };
  }

  const dxySignal = clamp((latestMacro.dxy - 100) / 1000, -0.012, 0.012);
  const copperSignal = clamp((4.2 - latestMacro.copper) / 35, -0.012, 0.012);
  const ratesSignal = clamp((-latestMacro.diffRates) / 170, -0.012, 0.012);
  const inflationSignal = clamp(latestMacro.diffInflation / 120, -0.01, 0.01);
  const vixSignal = clamp((latestMacro.vix - 16) / 900, -0.01, 0.01);
  const riskSignal = clamp((latestMacro.chileRisk - 105) / 1200, -0.01, 0.01);
  const oilSignal = clamp((latestMacro.oil - 78) / 850, -0.008, 0.008);

  const score =
    dxySignal * 0.24 +
    copperSignal * 0.2 +
    ratesSignal * 0.18 +
    inflationSignal * 0.12 +
    vixSignal * 0.12 +
    riskSignal * 0.09 +
    oilSignal * 0.05;

  const spreadAdjustment = Math.abs(vixSignal) * 0.45 + Math.abs(riskSignal) * 0.4 + Math.abs(copperSignal) * 0.25;

  return {
    score: clamp(score, -0.012, 0.012),
    spreadAdjustment: clamp(spreadAdjustment, 0, 0.008),
  };
}

function getRiskLevel(volatility12: number) {
  if (volatility12 >= 0.03) {
    return "Alto";
  }

  if (volatility12 >= 0.018) {
    return "Medio";
  }

  return "Acotado";
}

function getCopperAssumption(longMomentum: number) {
  if (longMomentum <= -0.003) {
    return "Soporte debil";
  }

  if (longMomentum >= 0.003) {
    return "Rango estable";
  }

  return "Neutral";
}

function getInternationalRateAssumption(baseDrift: number) {
  if (baseDrift >= 0.0035) {
    return "Sesgo alto";
  }

  if (baseDrift <= -0.0035) {
    return "Mas flexible";
  }

  return "Estable";
}

export function buildProjectionAssumptions(
  points: IndicatorPoint[],
  macroSeries: IndicatorMacroPoint[] = [],
): IndicatorAssumption[] {
  const inputs = buildProjectionInputs(points);
  const latestMacro = getLatestMacroPoint(macroSeries);

  if (!inputs) {
    return [
      {
        key: "local-inflation",
        label: "Inflacion local esperada",
        value: "Sin base suficiente",
        impact: "Se requiere mas historial real para poblar supuestos de proyeccion con consistencia.",
      },
      {
        key: "global-rate",
        label: "Tasa internacional",
        value: "Sin base suficiente",
        impact: "La metodologia necesita un tramo historico minimo antes de abrir escenarios.",
      },
      {
        key: "copper",
        label: "Precio del cobre",
        value: "Sin base suficiente",
        impact: "El contexto macro queda pendiente mientras no exista una base real suficiente para proyectar.",
      },
      {
        key: "global-risk",
        label: "Nivel de riesgo global",
        value: "Sin base suficiente",
        impact: "La banda de escenarios se activa solo cuando existe suficiente historial observado.",
      },
    ];
  }

  return [
    {
      key: "local-inflation",
      label: "Inflacion local esperada",
      value: latestMacro ? `${latestMacro.diffInflation.toFixed(2)} pts vs EE.UU.` : "Sin dato",
      impact: "Si Chile mantiene una inflacion relativa mayor, el modelo incorpora una presion depreciativa gradual sobre el CLP en horizontes medios y largos.",
    },
    {
      key: "global-rate",
      label: "Tasa internacional",
      value: latestMacro ? `${latestMacro.diffRates.toFixed(2)} pts Chile - EE.UU.` : getInternationalRateAssumption(inputs.baseDrift),
      impact: "El diferencial de tasas ajusta el atractivo relativo del peso chileno. Menor carry de Chile frente a EE.UU. empuja al alza el USD/CLP.",
    },
    {
      key: "copper",
      label: "Precio del cobre",
      value: latestMacro ? `US$ ${latestMacro.copper.toFixed(2)}/lb` : getCopperAssumption(inputs.longMomentum),
      impact: "El cobre opera como principal amortiguador externo: precios altos fortalecen al peso chileno y moderan el escenario base.",
    },
    {
      key: "global-risk",
      label: "Nivel de riesgo global",
      value: latestMacro ? `VIX ${latestMacro.vix.toFixed(1)} | Riesgo Chile ${latestMacro.chileRisk}` : getRiskLevel(inputs.volatility12),
      impact: "VIX y riesgo Chile abren la banda entre escenarios. Mayor aversion al riesgo global o prima local empuja un escenario de estres mas alto.",
    },
  ];
}

export function buildForecastPoints(
  points: IndicatorPoint[],
  months = 60,
  macroSeries: IndicatorMacroPoint[] = [],
): IndicatorPoint[] {
  const historical = getHistoricalPoints(points);
  const inputs = buildProjectionInputs(points);
  const latestMacro = getLatestMacroPoint(macroSeries);

  if (!inputs || historical.length === 0) {
    return [];
  }

  const lastHistoricalDate = historical.at(-1)?.date;

  if (!lastHistoricalDate) {
    return [];
  }

  const macroSignal = buildMacroSignal(latestMacro);
  let previousBase = inputs.latestValue;
  let previousOptimistic = inputs.latestValue;
  let previousStress = inputs.latestValue;

  return Array.from({ length: months }, (_, index) => {
    const month = index + 1;
    const date = addMonths(lastHistoricalDate, month).toISOString();
    const reversion = clamp(((inputs.mean12 - previousBase) / inputs.mean12) * 0.045, -0.0035, 0.0035);
    const termPremium = Math.min(month / months, 1) * inputs.volatility12 * 0.22;
    const macroDecay = Math.max(0.35, 1 - month / (months * 1.15));
    const macroContribution = macroSignal.score * macroDecay;
    const dynamicSpread = inputs.spreadDrift + macroSignal.spreadAdjustment * macroDecay;
    const baseGrowth = clamp(inputs.baseDrift + reversion + macroContribution, -0.015, 0.015);
    const optimisticGrowth = clamp(baseGrowth - dynamicSpread * 0.72 - termPremium * 0.28, -0.02, 0.012);
    const stressGrowth = clamp(baseGrowth + dynamicSpread + termPremium + 0.0015, -0.008, 0.028);

    const nextBase = round(previousBase * (1 + baseGrowth));
    const nextOptimisticRaw = round(previousOptimistic * (1 + optimisticGrowth));
    const nextStressRaw = round(previousStress * (1 + stressGrowth));
    const minimumSpread = 8 + month * 1.1;
    const nextOptimistic = round(Math.min(nextOptimisticRaw, nextBase - minimumSpread));
    const nextStress = round(Math.max(nextStressRaw, nextBase + minimumSpread));

    previousBase = nextBase;
    previousOptimistic = nextOptimistic;
    previousStress = nextStress;

    return {
      date,
      real: null,
      base: nextBase,
      optimistic: nextOptimistic,
      stress: nextStress,
    };
  });
}

export function getCurrentValue(points: IndicatorPoint[]) {
  return getHistoricalPoints(points).at(-1)?.real ?? 0;
}

export function getMonthlyVariation(points: IndicatorPoint[]) {
  const historical = getHistoricalPoints(points);
  const current = historical.at(-1)?.real ?? 0;
  const previous = historical.at(-2)?.real ?? current;

  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

export function getFilteredPoints(points: IndicatorPoint[], horizon: HorizonOption): DisplayPoint[] {
  const historical = getHistoricalPoints(points).slice(-24);
  const forecast = getForecastPoints(points).slice(0, horizon);

  return [...historical, ...forecast].map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat("es-CL", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(point.date)),
    monthLong: formatMonthLong(point.date),
    isForecast: point.real === null,
    displayValue: point.real ?? point.base ?? 0,
  }));
}

export function getProjectionValue(points: IndicatorPoint[], months: number) {
  const forecast = getForecastPoints(points);
  return forecast.at(months - 1)?.base ?? 0;
}

export function getYearlyVariation(points: IndicatorPoint[]) {
  const historical = getHistoricalPoints(points);
  const current = historical.at(-1)?.real ?? 0;
  const previousYear = historical.at(-13)?.real ?? historical.at(0)?.real ?? current;

  if (previousYear === 0) {
    return 0;
  }

  return ((current - previousYear) / previousYear) * 100;
}

export function getPeriodAverage(points: IndicatorPoint[], months: number) {
  const slice = getHistoricalPoints(points)
    .slice(-months)
    .map((point) => point.real ?? 0);

  if (slice.length === 0) {
    return 0;
  }

  return slice.reduce((total, value) => total + value, 0) / slice.length;
}

export function getPeriodRange(points: IndicatorPoint[], months: number) {
  const slice = getHistoricalPoints(points)
    .slice(-months)
    .map((point) => point.real ?? 0);

  if (slice.length === 0) {
    return 0;
  }

  return Math.max(...slice) - Math.min(...slice);
}

export function buildExecutiveSummary(
  indicator: IndicatorDefinition,
  horizon: HorizonOption,
): ExecutiveSummary {
  const historicalCount = getHistoricalPoints(indicator.points).length;

  if (historicalCount === 0) {
    return {
      title: "Sin datos observados disponibles",
      outlook: "estable",
      paragraphs: [
        `No fue posible cargar observaciones reales para ${indicator.name} en este momento.`,
        "La vista mantiene la estructura del producto, pero no completa metricas ni comparaciones cuando la fuente real no responde.",
        "No se usan mocks; el forecast solo se activa cuando existe historico real suficiente.",
      ],
    };
  }

  const currentValue = getCurrentValue(indicator.points);
  const monthlyVariation = getMonthlyVariation(indicator.points);
  const yearlyVariation = getYearlyVariation(indicator.points);
  const digits = indicator.displayDecimals ?? 0;
  const filtered = getFilteredPoints(indicator.points, horizon);
  const firstForecast = filtered.find((point) => point.isForecast);
  const finalForecast = filtered.at(-1);
  const baseStart = firstForecast?.base ?? currentValue;
  const baseEnd = finalForecast?.base ?? currentValue;
  const optimisticEnd = finalForecast?.optimistic ?? currentValue;
  const stressEnd = finalForecast?.stress ?? currentValue;
  const baseChange = baseStart === 0 ? 0 : ((baseEnd - baseStart) / baseStart) * 100;
  const spread = stressEnd - optimisticEnd;
  const latestMacro = getLatestMacroPoint(indicator.macroSeries ?? []);
  const isDollar = indicator.slug === "usd-clp";
  const isUf = indicator.slug === "uf-cl";

  let outlook: ExecutiveSummary["outlook"] = "estable";
  let title = "Escenario base con trayectoria contenida";

  if (Math.abs(baseChange) >= 6) {
    outlook = "alcista";
    title = "Sesgo alcista en el horizonte proyectado";
  }

  if (spread >= 120) {
    outlook = "volatil";
    title = "Trayectoria sensible a shocks externos";
  }

  const trendText =
    outlook === "estable"
      ? "La proyeccion base mantiene una pendiente moderada y sin quiebres bruscos, coherente con una inercia de mercado relativamente ordenada."
      : outlook === "alcista"
        ? "La trayectoria base conserva una presion alcista moderada a medida que se extiende el horizonte de reajuste."
        : isDollar
          ? "La dispersion entre escenarios se abre de manera visible, lo que sugiere un dolar mas sensible a shocks externos en el periodo proyectado."
          : "La dispersion entre escenarios se abre de forma visible, lo que sugiere un tramo menos lineal en el periodo proyectado.";

  const driverText = isDollar
    ? spread >= 120
      ? "Los factores con mayor capacidad de mover el dolar siguen siendo el riesgo global, el tono de tasas internacionales y el soporte del cobre."
      : "La lectura de fondo combina la serie observada con DXY, cobre, diferencial de tasas, diferencial de inflacion, VIX, riesgo Chile y petroleo."
    : isUf
      ? "La lectura de fondo toma la trayectoria observada de la UF y su ritmo reciente de indexacion, priorizando una explicacion simple para reajustes y contratos."
      : "La lectura de fondo se apoya en la serie observada del indicador y en la persistencia reciente de su trayectoria.";

  const firstParagraph = isDollar
    ? `El ${indicator.name} cierra el ultimo dato observado en ${formatCurrency(currentValue, digits)}, con una variacion mensual de ${monthlyVariation >= 0 ? "+" : ""}${monthlyVariation.toFixed(1)}% y una variacion anual de ${yearlyVariation >= 0 ? "+" : ""}${yearlyVariation.toFixed(1)}%. El escenario base proyecta ${formatCurrency(baseEnd, digits)} hacia ${finalForecast ? formatMonthLong(finalForecast.date) : "el cierre del horizonte"}.`
    : isUf
      ? `La ${indicator.name} cierra el ultimo dato observado en ${formatCurrency(currentValue, digits)}, con una variacion mensual de ${monthlyVariation >= 0 ? "+" : ""}${monthlyVariation.toFixed(1)}% y una variacion anual de ${yearlyVariation >= 0 ? "+" : ""}${yearlyVariation.toFixed(1)}%. El escenario base extiende la trayectoria hacia ${formatCurrency(baseEnd, digits)} a ${finalForecast ? formatMonthLong(finalForecast.date) : "el cierre del horizonte"}.`
      : `El ${indicator.name} cierra el ultimo dato observado en ${formatCurrency(currentValue, digits)}, con una variacion mensual de ${monthlyVariation >= 0 ? "+" : ""}${monthlyVariation.toFixed(1)}% y una variacion anual de ${yearlyVariation >= 0 ? "+" : ""}${yearlyVariation.toFixed(1)}%. El escenario base proyecta ${formatCurrency(baseEnd, digits)} hacia ${finalForecast ? formatMonthLong(finalForecast.date) : "el cierre del horizonte"}.`;

  const thirdParagraph = isDollar
    ? `${driverText}${latestMacro ? ` Hoy el set macro incorpora DXY ${latestMacro.dxy.toFixed(1)}, cobre en US$ ${latestMacro.copper.toFixed(2)}/lb, diferencial de tasas de ${latestMacro.diffRates.toFixed(2)} puntos, VIX ${latestMacro.vix.toFixed(1)} y riesgo Chile ${latestMacro.chileRisk}.` : ""} En el horizonte seleccionado, la banda entre escenario optimista y estres alcanza ${formatCurrency(spread, digits)}, lo que ayuda a visualizar el rango probable de reajuste para decisiones comerciales y contractuales.`
    : `${driverText} En el horizonte seleccionado, la banda entre escenario optimista y estres alcanza ${formatCurrency(spread, digits)}, lo que ayuda a visualizar un rango razonable de continuidad para decisiones contractuales y presupuestarias.`;

  return {
    title,
    outlook,
    paragraphs: [
      firstParagraph,
      trendText,
      thirdParagraph,
    ],
  };
}
