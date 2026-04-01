"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
} from "recharts";
import type { DisplayPoint } from "@/utils/indicator";
import { SectionCard } from "@/components/section-card";
import { formatCurrency } from "@/utils/format";

type ChartPanelProps = {
  data: DisplayPoint[];
  horizon: 12 | 24 | 60;
  indicatorCode: string;
  displayDecimals?: number;
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

export function ChartPanel({ data, horizon, indicatorCode, displayDecimals = 0 }: ChartPanelProps) {
  const [timeSpacing, setTimeSpacing] = useState<TimeSpacingOption["value"]>("quarterly");
  const hasData = data.length > 0;
  const activeSpacing = TIME_SPACING_OPTIONS.find((option) => option.value === timeSpacing) ?? TIME_SPACING_OPTIONS[1];
  const sampledData = useMemo(() => {
    if (activeSpacing.step === 1) {
      return data;
    }

    const firstForecastIndex = data.findIndex((point) => point.isForecast);
    const lastHistoricalIndex = firstForecastIndex > 0 ? firstForecastIndex - 1 : -1;
    const sampledIndexes = new Set<number>();

    if (firstForecastIndex === -1) {
      collectSampleIndexes(0, data.length - 1, activeSpacing.step).forEach((index) => sampledIndexes.add(index));
    } else {
      collectSampleIndexes(0, lastHistoricalIndex, activeSpacing.step).forEach((index) => sampledIndexes.add(index));
      collectSampleIndexes(firstForecastIndex, data.length - 1, activeSpacing.step).forEach((index) => sampledIndexes.add(index));
      sampledIndexes.add(firstForecastIndex);
      sampledIndexes.add(lastHistoricalIndex);
    }

    return [...sampledIndexes]
      .sort((left, right) => left - right)
      .map((index) => data[index]);
  }, [activeSpacing.step, data]);

  const chartData = useMemo(() => {
    return sampledData.map((point, index) => {
      const nextPoint = sampledData[index + 1];

      if (!point.isForecast && nextPoint?.isForecast) {
        return {
          ...point,
          base: point.real,
          optimistic: point.real,
          stress: point.real,
        };
      }

      return point;
    });
  }, [sampledData]);

  const ticks = useMemo(() => {
    return chartData
      .map((point) => point.label);
  }, [chartData]);

  return (
    <SectionCard className="p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Historico y forecast</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">Comparacion real vs escenarios</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            El tramo sombreado marca el periodo proyectado. La serie real se combina con escenarios mensuales base, optimista y estres.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
            Mostrando 24 meses reales + {horizon} meses proyectados · Espaciado {activeSpacing.label.toLowerCase()} · {chartData.length} puntos visibles
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
        {hasData ? (
          <ResponsiveContainer>
            <LineChart
              key={`${indicatorCode}-${horizon}-${timeSpacing}-${chartData.length}`}
              data={chartData}
              margin={{ top: 10, right: 6, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(22,32,43,0.08)" strokeDasharray="3 3" vertical={false} />
              {chartData.some((point) => point.isForecast) ? (
                <ReferenceArea
                  x1={chartData.find((point) => point.isForecast)?.label}
                  x2={chartData.at(-1)?.label}
                  fill="rgba(15,90,103,0.08)"
                  strokeOpacity={0}
                />
              ) : null}
              <XAxis
                dataKey="label"
                ticks={ticks}
                minTickGap={28}
                tick={{ fill: "#627180", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${Math.round(value)}`}
                tick={{ fill: "#627180", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                cursor={{ stroke: "rgba(22,32,43,0.12)", strokeDasharray: "4 4" }}
                contentStyle={{
                  borderRadius: "18px",
                  border: "1px solid rgba(19,36,51,0.08)",
                  background: "rgba(255,255,255,0.96)",
                  boxShadow: "0 16px 34px rgba(20,32,46,0.08)",
                }}
                formatter={(value: number | string, name: string) => {
                  const labelMap: Record<string, string> = {
                    real: `${indicatorCode} observado`,
                    base: "Escenario base",
                    optimistic: "Escenario optimista",
                    stress: "Escenario estres",
                  };

                  return [formatCurrency(Number(value), displayDecimals), labelMap[name] ?? name];
                }}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => {
                  const labelMap: Record<string, string> = {
                    real: `${indicatorCode} observado`,
                    base: "Base",
                    optimistic: "Optimista",
                    stress: "Estres",
                  };

                  return <span className="text-sm text-[var(--muted)]">{labelMap[value] ?? value}</span>;
                }}
              />
              <Line
                type="monotone"
                dataKey="real"
                stroke="#16202b"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
                name="real"
                activeDot={{ r: 5, fill: "#16202b" }}
              />
              <Line
                type="monotone"
                dataKey="base"
                stroke="#0f5a67"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
                name="base"
                activeDot={{ r: 5, fill: "#0f5a67" }}
              />
              <Line
                type="monotone"
                dataKey="optimistic"
                stroke="#c67a2d"
                strokeWidth={2.5}
                strokeDasharray="7 5"
                dot={false}
                connectNulls={false}
                name="optimistic"
              />
              <Line
                type="monotone"
                dataKey="stress"
                stroke="#8a3d3d"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                name="stress"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-white/40 px-6 text-center">
            <p className="max-w-md text-sm leading-7 text-[var(--muted)]">
              No hay datos observados disponibles para graficar en este momento. La proyeccion se activa solo cuando existe historico real suficiente.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
