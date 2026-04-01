import type { ExecutiveSummary as ExecutiveSummaryType } from "@/types/indicator";
import { SectionCard } from "@/components/section-card";

type ExecutiveSummaryProps = {
  summary: ExecutiveSummaryType;
};

const TONE_MAP = {
  estable: {
    badge: "Estable",
    className: "bg-[rgba(45,106,79,0.12)] text-[var(--success)]",
  },
  alcista: {
    badge: "Alcista",
    className: "bg-[rgba(198,122,45,0.16)] text-[var(--copper)]",
  },
  volatil: {
    badge: "Volatil",
    className: "bg-[rgba(138,61,61,0.14)] text-[var(--stress)]",
  },
} as const;

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  const tone = TONE_MAP[summary.outlook];

  return (
    <SectionCard className="p-6 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Resumen Ejecutivo</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">{summary.title}</h2>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tone.className}`}>{tone.badge}</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {summary.paragraphs.map((paragraph) => (
          <div key={paragraph} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] p-5">
            <p className="text-sm leading-7 text-[var(--muted)]">{paragraph}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
