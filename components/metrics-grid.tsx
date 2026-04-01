import type { IndicatorDefinition } from "@/types/indicator";
import { MetricCard } from "@/components/metric-card";
import { formatCurrency, formatPercent } from "@/utils/format";
import { getCurrentValue, getMonthlyVariation, getProjectionValue } from "@/utils/indicator";

type MetricsGridProps = {
  indicator: IndicatorDefinition;
};

export function MetricsGrid({ indicator }: MetricsGridProps) {
  const hasData = indicator.points.some((point) => point.real !== null);
  const currentValue = getCurrentValue(indicator.points);
  const monthlyVariation = getMonthlyVariation(indicator.points);
  const projection12 = getProjectionValue(indicator.points, 12);
  const projection60 = getProjectionValue(indicator.points, 60);
  const currentLabel = indicator.code === "UF" ? "Valor actual UF" : `Valor actual ${indicator.code}`;
  const digits = indicator.displayDecimals ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label={currentLabel}
        value={hasData ? formatCurrency(currentValue, digits) : "N/D"}
        hint="Ultimo dato observado desde la fuente real integrada."
        tone="neutral"
      />
      <MetricCard
        label="Variacion mensual"
        value={hasData ? `${monthlyVariation >= 0 ? "+" : ""}${formatPercent(monthlyVariation)}` : "N/D"}
        hint="Cambio frente al mes anterior para detectar presion reciente."
        tone="accent"
      />
      <MetricCard
        label="Proyeccion a 12 meses"
        value={hasData && projection12 > 0 ? formatCurrency(projection12, digits) : "N/D"}
        hint="Escenario base para conversaciones de reajuste de corto plazo."
        tone="neutral"
      />
      <MetricCard
        label="Proyeccion a 60 meses"
        value={hasData && projection60 > 0 ? formatCurrency(projection60, digits) : "N/D"}
        hint="Vision extendida para contratos de mayor duracion."
        tone="copper"
      />
    </div>
  );
}
