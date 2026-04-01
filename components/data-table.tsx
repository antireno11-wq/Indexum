import type { DisplayPoint } from "@/utils/indicator";
import { SectionCard } from "@/components/section-card";
import { formatCurrency } from "@/utils/format";

type DataTableProps = {
  data: DisplayPoint[];
  displayDecimals?: number;
};

export function DataTable({ data, displayDecimals = 0 }: DataTableProps) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] px-6 py-6 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Detalle mensual</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Historico y escenarios</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
          La columna principal muestra el dato real cuando existe y luego el valor proyectado para mantener una lectura continua.
        </p>
      </div>

      <div className="overflow-x-auto">
        {data.length > 0 ? (
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.55)] text-left">
                {["Mes", "Valor real o proyectado", "Escenario base", "Escenario optimista", "Escenario estres"].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-[var(--border)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)] md:px-8"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.date} className="odd:bg-[rgba(255,255,255,0.42)]">
                  <td className="border-b border-[var(--border)] px-6 py-4 text-sm font-semibold text-[var(--foreground)] md:px-8">
                    <div>{point.monthLong}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                      {point.isForecast ? "Forecast" : "Historico"}
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-6 py-4 text-sm text-[var(--foreground)] md:px-8">
                    {formatCurrency(point.displayValue, displayDecimals)}
                  </td>
                  <td className="border-b border-[var(--border)] px-6 py-4 text-sm text-[var(--muted)] md:px-8">
                    {point.base !== null ? formatCurrency(point.base, displayDecimals) : "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-6 py-4 text-sm text-[var(--muted)] md:px-8">
                    {point.optimistic !== null ? formatCurrency(point.optimistic, displayDecimals) : "—"}
                  </td>
                  <td className="border-b border-[var(--border)] px-6 py-4 text-sm text-[var(--muted)] md:px-8">
                    {point.stress !== null ? formatCurrency(point.stress, displayDecimals) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center text-sm leading-7 text-[var(--muted)] md:px-8">
            No hay filas para mostrar mientras la fuente real no entregue informacion suficiente para proyectar.
          </div>
        )}
      </div>
    </SectionCard>
  );
}
