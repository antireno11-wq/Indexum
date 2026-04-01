import type { IndicatorDefinition } from "@/types/indicator";
import { StatusBadge } from "@/components/status-badge";

type DashboardHeaderProps = {
  indicator: IndicatorDefinition;
};

export function DashboardHeader({ indicator }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <StatusBadge />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">
            Plataforma de proyeccion
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-[var(--foreground)] md:text-5xl">
          Proyeccion de Indicadores
        </h1>
        <p className="mt-3 text-lg font-medium text-[var(--muted)]">{indicator.subtitle}</p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">{indicator.intro}</p>
      </div>

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Indicador activo</p>
        <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{indicator.code}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{indicator.description}</p>
      </div>
    </div>
  );
}
