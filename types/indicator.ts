export type IndicatorPoint = {
  date: string;
  real: number | null;
  base: number | null;
  optimistic: number | null;
  stress: number | null;
};

export type IndicatorAssumption = {
  key: string;
  label: string;
  value: string;
  impact: string;
};

export type IndicatorDefinition = {
  slug: string;
  name: string;
  code: string;
  unit: string;
  displayDecimals?: number;
  subtitle: string;
  intro: string;
  description: string;
  methodologyNote: string;
  assumptions: IndicatorAssumption[];
  points: IndicatorPoint[];
  macroSeries?: IndicatorMacroPoint[];
  dataSource?: {
    provider: string;
    mode: "mock" | "hybrid" | "live";
    lastUpdated?: string;
    note: string;
  };
};

export type HorizonOption = 12 | 24 | 60;

export type ExecutiveSummary = {
  title: string;
  outlook: "estable" | "alcista" | "volatil";
  paragraphs: string[];
};

export type IndicatorMacroPoint = {
  date: string;
  dxy: number;
  copper: number;
  diffRates: number;
  diffInflation: number;
  vix: number;
  chileRisk: number;
  oil: number;
};

export type DieselRegionPoint = {
  regionCode: string;
  regionName: string;
  order: number;
  zoneId: number;
  zoneName: string;
  price: number;
};

export type DieselSnapshot = {
  nationalAverage: number;
  spread: number;
  minRegion: DieselRegionPoint;
  maxRegion: DieselRegionPoint;
  regions: DieselRegionPoint[];
  lastUpdated: string;
};

export type DieselMonthlyPoint = {
  date: string;
  year: number;
  month: number;
  price: number;
};
