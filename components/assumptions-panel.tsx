import type { IndicatorDefinition } from "@/types/indicator";
import { SectionCard } from "@/components/section-card";

type AssumptionsPanelProps = {
  indicator: IndicatorDefinition;
};

export function AssumptionsPanel({ indicator }: AssumptionsPanelProps) {
  return (
    <SectionCard className="h-full p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Supuestos usados</p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Lectura simple de mercado</h2>
      <div className="mt-6 space-y-4">
        {indicator.assumptions.map((assumption) => (
          <div
            key={assumption.key}
            className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">{assumption.label}</p>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {assumption.value}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{assumption.impact}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[22px] border border-[rgba(15,90,103,0.14)] bg-[rgba(15,90,103,0.08)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Criterio metodologico</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{indicator.methodologyNote}</p>
      </div>
    </SectionCard>
  );
}
