"use client";

import { useMemo, useState } from "react";
import { DieselDashboard } from "@/components/diesel-dashboard";
import { IndicatorDashboard } from "@/components/indicator-dashboard";
import { IndicatorPicker } from "@/components/indicator-picker";
import { indicatorCatalog } from "@/data/mock-indicators";

export function HomeDashboard() {
  const [selectedSlug, setSelectedSlug] = useState("usd-clp");
  const selectedIndicator = useMemo(
    () => indicatorCatalog.find((indicator) => indicator.slug === selectedSlug) ?? indicatorCatalog[0],
    [selectedSlug],
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1400px] justify-start px-4 pt-10 md:px-8 xl:px-10">
        <IndicatorPicker indicators={indicatorCatalog} selectedSlug={selectedSlug} onChange={setSelectedSlug} />
      </div>
      {selectedSlug === "diesel-cl" ? (
        <DieselDashboard indicator={selectedIndicator} />
      ) : (
        <IndicatorDashboard indicator={selectedIndicator} />
      )}
    </main>
  );
}
