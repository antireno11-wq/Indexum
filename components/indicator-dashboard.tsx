"use client";

import { useEffect, useState } from "react";
import { AssumptionsPanel } from "@/components/assumptions-panel";
import { ChartPanel } from "@/components/chart-panel";
import { DataSourcePanel } from "@/components/data-source-panel";
import { DashboardHeader } from "@/components/dashboard-header";
import { DataTable } from "@/components/data-table";
import { ExecutiveSummary } from "@/components/executive-summary";
import { HorizonFilter } from "@/components/horizon-filter";
import { MetricsGrid } from "@/components/metrics-grid";
import type { HorizonOption, IndicatorDefinition } from "@/types/indicator";
import { hydrateIndicatorFromMindicador } from "@/utils/mindicador";
import { buildExecutiveSummary, getFilteredPoints } from "@/utils/indicator";

type IndicatorDashboardProps = {
  indicator: IndicatorDefinition;
};

export function IndicatorDashboard({ indicator }: IndicatorDashboardProps) {
  const [horizon, setHorizon] = useState<HorizonOption>(24);
  const [activeIndicator, setActiveIndicator] = useState(indicator);
  const [dataState, setDataState] = useState<"loading" | "live" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadLiveIndicator() {
      setDataState("loading");
      setActiveIndicator(indicator);

      try {
        const liveIndicator = await hydrateIndicatorFromMindicador(indicator);

        if (!cancelled) {
          setActiveIndicator(liveIndicator);
          setDataState("live");
        }
      } catch (error) {
        console.error("Unable to load indicator data", error);

        if (!cancelled) {
          setActiveIndicator({ ...indicator, points: [] });
          setDataState("error");
        }
      }
    }

    loadLiveIndicator();

    return () => {
      cancelled = true;
    };
  }, [indicator]);

  const filteredPoints = getFilteredPoints(activeIndicator.points, horizon);
  const summary = buildExecutiveSummary(activeIndicator, horizon);

  return (
    <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8 md:py-14 xl:px-10">
      <DashboardHeader indicator={activeIndicator} />
      <DataSourcePanel indicator={activeIndicator} state={dataState} />
      <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow)] backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Horizonte de analisis</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Ajusta el horizonte de forecast para revisar escenarios de corto, mediano o largo plazo.
          </p>
        </div>
        <HorizonFilter value={horizon} onChange={setHorizon} />
      </div>

      <MetricsGrid indicator={activeIndicator} />

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <ChartPanel
          data={filteredPoints}
          horizon={horizon}
          indicatorCode={activeIndicator.code}
          displayDecimals={activeIndicator.displayDecimals}
        />
        <AssumptionsPanel indicator={activeIndicator} />
      </div>

      <ExecutiveSummary summary={summary} />
      <DataTable data={filteredPoints} displayDecimals={activeIndicator.displayDecimals} />
    </div>
  );
}
