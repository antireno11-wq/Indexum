import type { DieselMonthlyPoint } from "@/types/indicator";

type DieselHistoryResponse = {
  success: boolean;
  code?: string;
  message?: string;
  hint?: string;
  source?: string;
  lastUpdated?: string | null;
  points?: DieselMonthlyPoint[];
};

export async function fetchDieselHistory() {
  const response = await fetch("/api/diesel/history");
  const payload = (await response.json()) as DieselHistoryResponse;

  if (!response.ok || !payload.success || !payload.points) {
    const parts = [payload.message ?? "Unable to load diesel history from internal API", payload.hint]
      .filter(Boolean)
      .join(" ");
    throw new Error(parts);
  }

  return payload;
}
