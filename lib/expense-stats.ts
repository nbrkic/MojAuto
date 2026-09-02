import type { BarDatum } from "@/components/charts/bar-chart";

const MONTHS_SHORT_SR = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];

/** Totals for the last `monthsBack` months (oldest first), for a monthly bar chart. */
export function groupExpensesByMonth(
  expenses: { date: string; amount: number }[],
  monthsBack = 6,
): BarDatum[] {
  const now = new Date();
  return Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const value = expenses
      .filter((e) => e.date.startsWith(key))
      .reduce((sum, e) => sum + e.amount, 0);
    return { key, label: MONTHS_SHORT_SR[d.getMonth()], value };
  });
}
