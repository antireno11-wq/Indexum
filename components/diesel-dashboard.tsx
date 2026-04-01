"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardHeader } from "@/components/dashboard-header";
import { DataSourcePanel } from "@/components/data-source-panel";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import type { DieselMonthlyPoint, IndicatorDefinition } from "@/types/indicator";
import { formatCurrency, formatMonthLong } from "@/utils/format";
import { fetchDieselHistory } from "@/utils/diesel-history";

type DieselDashboardProps = {
  indicator: IndicatorDefinition;
};

type DieselHistoryState = {
  lastUpdated?: string | null;
  points: DieselMonthlyPoint[];
};

type TimeSpacingOption = {
  label: string;
  value: "monthly" | "quarterly" | "semiannual";
  step: number;
};

const TIME_SPACING_OPTIONS: TimeSpacingOption[] = [
  { label: "Mensual", value: "monthly", step: 1 },
  { label: "Trimestral", value: "quarterly", step: 3 },
  { label: "Semestral", value: "semiannual", step: 6 },
];

function collectSampleIndexes(startIndex: number, endIndex: number, step: number) {
  const indexes = new Set<number>();

  if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
    return indexes;
  }

  indexes.add(startIndex);
  indexes.add(endIndex);

  for (let index = endIndex; index >= startIndex; index -= step) {
    indexes.add(index);
  }

  return indexes;
}

function getCurrentValue(points: DieselMonthlyPoint[]) {
  return points.at(-1)?.price ?? 0;
}

function getMonthlyVariation(points: DieselMonthlyPoint[]) {
  const current = points.at(-1)?.price ?? 0;
  const previous = points.at(-2)?.price ?? current;

  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

function getYearlyVariation(points: DieselMonthlyPoint[]) {
  const current = points.at(-1)?.price ?? 0;
  const previousYear = points.at(-13)?.price ?? points.at(0)?.price ?? current;

  if (previousYear === 0) {
    return 0;
  }

  return ((current - previousYear) / previousYear) * 100;
}

function getAverage12(points: DieselMonthlyPoint[]) {
  const slice = points.slice(-12);

  if (slice.length === 0) {
    return 0;
  }

  return slice.reduce((total, point) => total + point.price, 0) / slice.length;
}

export function DieselDashboard({ indicator }: DieselDashboardProps) {
  const [history, setHistory] = useState<DieselHistoryState>({ points: [] });
  const [dataState, setDataState] = useState<"loading" | "live" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeSpacing, setTimeSpacing] = useState<TimeSpacingOption["value"]>("quarterly");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const payload = await fetchDieselHistory();

        if (!cancelled) {
          setHistory({ points: payload.points ?? [], lastUpdated: payload.lastUpdated ?? null });
          setDataState("live");
          setErrorMessage(null);
        }
      } catch (error) {
        console.error("Unable to load diesel history", error);

        if (!cancelled) {
          setHistory({ points: [] });
          setDataState("error");
          setErrorMessage(error instanceof Error ? error.message : "Unable to load diesel history");
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeIndicator = useMemo(() => {
    return {
      ...indicator,
      dataSource: {
        provider: "CNE API",
        mode: "live" as const,
        note:
          dataState === "error"
            ? "La vista de diesel requiere una serie historica mensual desde la API CNE. Configura CNE_API_TOKEN para habilitarla."
            : "Serie historica mensual de diesel construida desde la API CNE y agregada a nivel nacional.",
        lastUpdated: history.lastUpdated ?? undefined,
      },
    };
  }, [dataState, history.lastUpdated, indicator]);

  const activeSpacing = TIME_SPACING_OPTIONS.find((option) => option.value === timeSpacing) ?? TIME_SPACING_OPTIONS[1];
  const chartData = useMemo(() => {
    const pointsWithLabel = history.points.map((point) => ({
      ...point,
      label: formatMonthLong(point.date),
    }));

    if (activeSpacing.step === 1) {
      return pointsWithLabel;
    }

    const sampledIndexes = collectSampleIndexes(0, pointsWithLabel.length - 1, activeSpacing.step);

    return [...sampledIndexes]
      .sort((left, right) => left - right)
      .map((index) => pointsWithLabel[index]);
  }, [activeSpacing.step, history.points]);

  const currentValue = getCurrentValue(history.points);
  const monthlyVariation = getMonthlyVariation(history.points);
  const yearlyVariation = getYearlyVariation(history.points);
  const average12 = getAverage12(history.points);

  return (
    <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-10 md:px-8 md:py-14 xl:px-10">
      <DashboardHeader indicator={activeIndicator} />
      <DataSourcePanel indicator={activeIndicator} state={dataState} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Precio general diesel"
          value={chartData.length > 0 ? formatCurrency(currentValue) : "N/D"}
          hint="Ultimo precio promedio mensual nacional disponible."
        />
        <MetricCard
          label="Variacion mensual"
          value={chartData.length > 1 ? `${monthlyVariation >= 0 ? "+" : ""}${monthlyVariation.toFixed(1)}%` : "N/D"}
          hint="Cambio frente al mes anterior."
          tone="accent"
        />
        <MetricCard
          label="Variacion anual"
          value={chartData.length > 12 ? `${yearlyVariation >= 0 ? "+" : ""}${yearlyVariation.toFixed(1)}%` : "N/D"}
          hint="Cambio frente al mismo mes del ano anterior."
        />
        <MetricCard
          label="Promedio 12 meses"
          value={chartData.length > 0 ? formatCurrency(average12) : "N/D"}
          hint="Promedio movil de los ultimos 12 meses."
          tone="copper"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <SectionCard className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Serie mensual</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Precio general del diesel</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                La serie se agrega a nivel nacional y puede resumirse en frecuencia mensual, trimestral o semestral para facilitar lectura ejecutiva.
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                Espaciado {activeSpacing.label.toLowerCase()} · {chartData.length} puntos visibles
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Espaciado temporal</p>
              <div className="inline-flex rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.84)] p-1 shadow-sm">
                {TIME_SPACING_OPTIONS.map((option) => {
                  const isActive = option.value === timeSpacing;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTimeSpacing(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[var(--foreground)] text-white shadow-sm"
                          : "text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 h-[380px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart
                  key={`diesel-${timeSpacing}-${chartData.length}`}
                  data={chartData}
                  margin={{ top: 10, right: 6, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(22,32,43,0.08)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" minTickGap={28} tick={{ fill: "#627180", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${Math.round(value)}`} tick={{ fill: "#627180", fontSize: 12 }} tickLine={false} axisLine={false} width={76} />
                  <Tooltip
                    cursor={{ stroke: "rgba(22,32,43,0.12)", strokeDasharray: "4 4" }}
                    contentStyle={{
                      borderRadius: "18px",
                      border: "1px solid rgba(19,36,51,0.08)",
                      background: "rgba(255,255,255,0.96)",
                      boxShadow: "0 16px 34px rgba(20,32,46,0.08)",
                    }}
                    formatter={(value: number | string) => [formatCurrency(Number(value)), "Precio promedio nacional"]}
                    labelFormatter={(label) => `Mes: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#0f5a67"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#0f5a67" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-white/40 px-6 text-center">
                <p className="max-w-md text-sm leading-7 text-[var(--muted)]">
                  {errorMessage ?? "No hay datos historicos mensuales de diesel disponibles en este momento."}
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard className="h-full p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Resumen Ejecutivo</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Serie nacional mensual del diesel</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] p-4">
              <p className="text-sm leading-7 text-[var(--muted)]">
                {chartData.length > 0
                  ? `El ultimo dato mensual disponible ubica el diesel en ${formatCurrency(currentValue)} por litro a nivel nacional.`
                  : "La serie historica mensual del diesel queda pendiente hasta contar con respuesta valida desde la API CNE."}
              </p>
            </div>
            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] p-4">
              <p className="text-sm leading-7 text-[var(--muted)]">
                {chartData.length > 12
                  ? `La variacion anual observada alcanza ${yearlyVariation >= 0 ? "+" : ""}${yearlyVariation.toFixed(1)}%, lo que permite leer tendencia de costos con una base mucho mas util para negocio.`
                  : "Cuando la serie tenga suficiente profundidad, esta tarjeta resumira la tendencia anual del precio general."}
              </p>
            </div>
            <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] p-4">
              <p className="text-sm leading-7 text-[var(--muted)]">
                {dataState === "error"
                  ? "Para activar esta vista historica debes definir CNE_API_TOKEN en el entorno del proyecto con un bearer valido de la API CNE."
                  : "La vista esta preparada para alimentar comparaciones temporales y futuros modelos de forecast del diesel sobre base mensual."}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
