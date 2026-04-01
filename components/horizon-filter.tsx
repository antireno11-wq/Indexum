import type { HorizonOption } from "@/types/indicator";

type HorizonFilterProps = {
  value: HorizonOption;
  onChange: (value: HorizonOption) => void;
};

const OPTIONS: HorizonOption[] = [12, 24, 60];

export function HorizonFilter({ value, onChange }: HorizonFilterProps) {
  return (
    <div className="inline-flex rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.72)] p-1 shadow-sm">
      {OPTIONS.map((option) => {
        const active = option === value;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[var(--foreground)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-white/80 hover:text-[var(--foreground)]"
            }`}
          >
            {option} meses
          </button>
        );
      })}
    </div>
  );
}
