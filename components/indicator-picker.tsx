"use client";

import type { IndicatorDefinition } from "@/types/indicator";

type IndicatorPickerProps = {
  indicators: IndicatorDefinition[];
  selectedSlug: string;
  onChange: (slug: string) => void;
};

export function IndicatorPicker({ indicators, selectedSlug, onChange }: IndicatorPickerProps) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] p-2 shadow-[var(--shadow)] backdrop-blur-sm">
      {indicators.map((indicator) => {
        const active = indicator.slug === selectedSlug;

        return (
          <button
            key={indicator.slug}
            type="button"
            onClick={() => onChange(indicator.slug)}
            className={`rounded-[20px] px-4 py-3 text-left transition ${
              active ? "bg-[var(--foreground)] text-white shadow-sm" : "bg-white/70 text-[var(--foreground)] hover:bg-white"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{indicator.code}</div>
            <div className="mt-1 text-sm font-semibold">{indicator.name}</div>
          </button>
        );
      })}
    </div>
  );
}
