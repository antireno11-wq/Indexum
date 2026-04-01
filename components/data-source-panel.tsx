import type { IndicatorDefinition } from "@/types/indicator";
import { formatDateShort } from "@/utils/format";

type DataSourcePanelProps = {
  indicator: IndicatorDefinition;
  state: "loading" | "live" | "error";
};

export function DataSourcePanel({ indicator, state }: DataSourcePanelProps) {
  const source = indicator.dataSource;

  const toneClass =
    state === "live"
      ? "border-[rgba(45,106,79,0.16)] bg-[rgba(45,106,79,0.08)]"
      : state === "loading"
        ? "border-[rgba(198,122,45,0.16)] bg-[rgba(198,122,45,0.08)]"
        : "border-[rgba(138,61,61,0.14)] bg-[rgba(138,61,61,0.08)]";

  const providerLabel = source?.provider ?? "fuente real";
  const statusLabel =
    state === "live" ? `Conectado a ${providerLabel}` : state === "loading" ? "Cargando fuente real" : "Sin datos disponibles";

  return (
    <div className={`flex flex-col gap-4 rounded-[28px] border px-5 py-5 shadow-[var(--shadow)] backdrop-blur-sm md:flex-row md:items-start md:justify-between md:px-6 ${toneClass}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Fuente de datos</p>
        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{statusLabel}</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          {state === "error"
            ? "No fue posible cargar la fuente real en este momento. Para mantener integridad, la vista no muestra datos sinteticos."
            : source?.note ?? "La aplicacion esta usando solo observaciones reales del indicador."}
        </p>
      </div>

      <div className="rounded-[22px] border border-white/50 bg-white/70 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Proveedor</p>
        <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{source?.provider ?? "Sin proveedor cargado"}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {source?.lastUpdated ? `Ultimo dato: ${formatDateShort(source.lastUpdated)}` : "Sin timestamp real"}
        </p>
      </div>
    </div>
  );
}
