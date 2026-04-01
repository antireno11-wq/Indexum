import type { IndicatorDefinition } from "@/types/indicator";
import { getUsdClpMacroSeries } from "@/data/usdclp-macro";

const usdClpIndicator: IndicatorDefinition = {
  slug: "usd-clp",
  name: "Dolar USD/CLP",
  code: "USD/CLP",
  unit: "CLP",
  displayDecimals: 0,
  subtitle: "MVP inicial - Dolar",
  intro:
    "Una vista ejecutiva para entender en segundos el nivel actual del dolar, su trayectoria reciente y el rango de proyeccion esperado para decisiones de reajuste.",
  description: "Vista ejecutiva del dolar para apoyar reajustes, presupuestos y conversaciones comerciales.",
  methodologyNote:
    "Historico y valor actual observados desde una fuente real. Las proyecciones se activan sobre esa base con una metodologia simple y transparente.",
  assumptions: [
    {
      key: "local-inflation",
      label: "Inflacion local esperada",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app deriva la proyeccion desde la serie real.",
    },
    {
      key: "global-rate",
      label: "Tasa internacional",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app deriva la proyeccion desde la serie real.",
    },
    {
      key: "copper",
      label: "Precio del cobre",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app deriva la proyeccion desde la serie real.",
    },
    {
      key: "global-risk",
      label: "Riesgo global",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app deriva la proyeccion desde la serie real.",
    },
  ],
  points: [],
  macroSeries: getUsdClpMacroSeries(),
  dataSource: {
    provider: "mindicador.cl",
    mode: "hybrid",
    note: "Historico real desde mindicador.cl y proyeccion derivada de la serie observada.",
  },
};

const ufIndicator: IndicatorDefinition = {
  slug: "uf-cl",
  name: "Unidad de Fomento",
  code: "UF",
  unit: "CLP",
  displayDecimals: 2,
  subtitle: "MVP inicial - UF",
  intro:
    "Una vista ejecutiva para seguir el valor de la UF, revisar su trayectoria mensual y contar con una lectura simple de continuidad para contratos, reajustes y presupuestos indexados.",
  description: "Vista ejecutiva de la UF para reajustes, contratos indexados y seguimiento financiero.",
  methodologyNote:
    "Historico y valor actual observados desde una fuente real. La proyeccion se apoya en la trayectoria observada de la UF y su comportamiento reciente, sin depender de mocks.",
  assumptions: [
    {
      key: "inflation-pass-through",
      label: "Inflacion incorporada",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app deriva la lectura desde el historico real de la UF.",
    },
    {
      key: "recent-trend",
      label: "Tendencia reciente",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app calcula la pendiente mensual observada.",
    },
    {
      key: "average-level",
      label: "Promedio 12 meses",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app consolida el nivel medio observado del ultimo ano.",
    },
    {
      key: "range-12m",
      label: "Rango 12 meses",
      value: "Pendiente de calculo",
      impact: "Se reemplaza cuando la app deriva el rango observado para dimensionar estabilidad.",
    },
  ],
  points: [],
  macroSeries: [],
  dataSource: {
    provider: "mindicador.cl",
    mode: "hybrid",
    note: "Historico real de UF desde mindicador.cl y continuidad proyectada a partir de la serie observada.",
  },
};

const dieselIndicator: IndicatorDefinition = {
  slug: "diesel-cl",
  name: "Petroleo Diesel",
  code: "DI",
  unit: "CLP/L",
  displayDecimals: 0,
  subtitle: "MVP inicial - Diesel",
  intro:
    "Una vista ejecutiva para monitorear el precio promedio del diesel en Chile, con lectura nacional y comparacion regional desde fuentes oficiales de mercado.",
  description: "Snapshot ejecutivo del diesel para compras, contratos y monitoreo de costos operacionales.",
  methodologyNote:
    "El diesel se presenta en modo snapshot usando precios promedio regionales publicados por Bencina en Linea. Se prioriza fidelidad del dato actual antes de abrir forecast con una serie historica formal.",
  assumptions: [
    {
      key: "coverage",
      label: "Cobertura territorial",
      value: "Promedio regional",
      impact: "La lectura nacional se arma agregando precios promedio por region para evitar depender de una sola estacion o zona.",
    },
    {
      key: "service-type",
      label: "Tipo de atencion",
      value: "Asistido y autoservicio",
      impact: "Cuando existen ambos precios en una region, la vista consolida ambas referencias para obtener una lectura de mercado mas estable.",
    },
    {
      key: "frequency",
      label: "Frecuencia",
      value: "Snapshot actual",
      impact: "Esta primera version muestra mercado actual. El forecast del diesel queda para una siguiente fase con serie historica dedicada.",
    },
    {
      key: "source",
      label: "Fuente oficial",
      value: "CNE",
      impact: "Los datos se obtienen desde la infraestructura publica de Bencina en Linea de la Comision Nacional de Energia.",
    },
  ],
  points: [],
  macroSeries: [],
  dataSource: {
    provider: "Bencina en Linea (CNE)",
    mode: "live",
    note: "Precio actual del diesel construido con promedios regionales publicados por la CNE.",
  },
};

export const indicatorCatalog: IndicatorDefinition[] = [usdClpIndicator, ufIndicator, dieselIndicator];

export function getIndicatorBySlug(slug: string) {
  const indicator = indicatorCatalog.find((item) => item.slug === slug);

  if (!indicator) {
    throw new Error(`Indicator not found: ${slug}`);
  }

  return indicator;
}
