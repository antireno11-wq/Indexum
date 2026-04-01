type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "accent" | "copper";
};

export function MetricCard({ label, value, hint, tone = "neutral" }: MetricCardProps) {
  const toneClass =
    tone === "accent"
      ? "bg-[linear-gradient(180deg,rgba(15,90,103,0.12),rgba(255,255,255,0.96))]"
      : tone === "copper"
        ? "bg-[linear-gradient(180deg,rgba(198,122,45,0.14),rgba(255,255,255,0.96))]"
        : "bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.96))]";

  return (
    <article className={`rounded-[24px] border border-[var(--border)] p-5 shadow-[0_18px_42px_rgba(20,32,46,0.07)] ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">{label}</p>
      <p className="mt-4 text-3xl font-extrabold tracking-[-0.05em] text-[var(--foreground)]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{hint}</p>
    </article>
  );
}
