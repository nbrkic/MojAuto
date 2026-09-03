const MONTHS_SR = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

/** "12.500" — dot as thousands separator, no decimals. */
export function formatNumberSr(value: number): string {
  const rounded = Math.round(value);
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${rounded < 0 ? "-" : ""}${grouped}`;
}

/** "12.500 RSD" */
export function formatRSD(amount: number): string {
  return `${formatNumberSr(amount)} RSD`;
}

/** "8.500 €" */
export function formatEUR(amount: number): string {
  return `${formatNumberSr(amount)} €`;
}

function parseDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** "28. avgust 2026." */
export function formatDateLongSr(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  return `${date.getDate()}. ${MONTHS_SR[date.getMonth()]} ${date.getFullYear()}.`;
}

/** "28.08.2026." */
export function formatDateNumericSr(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}.`;
}

/** "28.08" — compact, no year, for chart axis labels. */
export function formatDateShortSr(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/** Local "YYYY-MM-DD" (avoids UTC-shift bugs from toISOString()). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from today until dateStr — negative means overdue. */
export function daysUntil(dateStr: string): number {
  const target = parseDate(dateStr);
  if (!target) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatKm(km: number): string {
  return `${formatNumberSr(km)} km`;
}

/** Uppercases just the first character — autoCapitalize is only a keyboard hint, not enforced. */
export function capitalizeFirst(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
