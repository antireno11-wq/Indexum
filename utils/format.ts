export function formatCurrency(value: number, digits = 0) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value / 100);
}

export function formatMonthLabel(date: string, short = true) {
  return new Intl.DateTimeFormat("es-CL", {
    month: short ? "short" : "long",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatMonthLong(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatDateShort(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
