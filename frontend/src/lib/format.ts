const LOCALE = "tr-TR";
const TIME_ZONE = "Europe/Istanbul";

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Relative score in [-1, 1] shown as a signed integer in [-100, 100]. */
export function formatScore(score: number): string {
  const value = Math.round(score * 100);
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}

export function formatPercentChange(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}%${formatNumber(Math.abs(value), 1)}`;
}

export function formatDay(isoDate: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}
