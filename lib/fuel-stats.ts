import type { BarDatum } from "@/components/charts/bar-chart";

const MONTHS_SHORT_SR = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];

export type FuelEntry = {
  id: number;
  date: string;
  amount: number;
  liters: number;
  mileage_at_fillup: number;
  is_full_tank: boolean;
};

export type FuelInterval = {
  fromDate: string;
  toDate: string;
  distanceKm: number;
  liters: number;
  cost: number;
  l100km: number;
  rsdPerKm: number;
};

export type FuelStats = {
  intervals: FuelInterval[];
  avgL100km: number | null;
  avgRsdPerKm: number | null;
  avgPricePerLiter: number | null;
  monthlyL100km: BarDatum[];
  currentMonthLiters: number;
  currentMonthCost: number;
  rangeOnFullTankKm: number | null;
};

/**
 * Full-to-full method: between two consecutive "filled to full" fill-ups,
 * the sum of every liter added since the previous full tank (including any
 * partial top-ups in between) equals exactly what was burned over that
 * mileage delta — so L/100km for the interval is exact, not estimated.
 */
export function computeFuelStats(entriesInput: FuelEntry[], tankCapacityL: number | null): FuelStats {
  const entries = entriesInput
    .filter((e) => e.mileage_at_fillup != null && e.liters != null)
    .sort((a, b) => a.mileage_at_fillup - b.mileage_at_fillup || a.date.localeCompare(b.date));

  const intervals: FuelInterval[] = [];
  let anchorIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i].is_full_tank) continue;
    if (anchorIndex === -1) {
      anchorIndex = i;
      continue;
    }
    const from = entries[anchorIndex];
    const to = entries[i];
    const distanceKm = to.mileage_at_fillup - from.mileage_at_fillup;
    if (distanceKm > 0) {
      let liters = 0;
      let cost = 0;
      for (let j = anchorIndex + 1; j <= i; j++) {
        liters += entries[j].liters;
        cost += entries[j].amount;
      }
      intervals.push({
        fromDate: from.date,
        toDate: to.date,
        distanceKm,
        liters,
        cost,
        l100km: (liters / distanceKm) * 100,
        rsdPerKm: cost / distanceKm,
      });
    }
    anchorIndex = i;
  }
  intervals.reverse();

  const totalDistance = intervals.reduce((s, iv) => s + iv.distanceKm, 0);
  const totalLiters = intervals.reduce((s, iv) => s + iv.liters, 0);
  const totalCost = intervals.reduce((s, iv) => s + iv.cost, 0);

  const avgL100km = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : null;
  const avgRsdPerKm = totalDistance > 0 ? totalCost / totalDistance : null;

  const priceLitersTotal = entries.reduce((s, e) => s + e.liters, 0);
  const priceCostTotal = entries.reduce((s, e) => s + e.amount, 0);
  const avgPricePerLiter = priceLitersTotal > 0 ? priceCostTotal / priceLitersTotal : null;

  const rangeOnFullTankKm =
    avgL100km !== null && avgL100km > 0 && tankCapacityL ? (tankCapacityL / avgL100km) * 100 : null;

  const now = new Date();
  const monthlyL100km: BarDatum[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthIntervals = intervals.filter((iv) => iv.toDate.startsWith(key));
    const km = monthIntervals.reduce((s, iv) => s + iv.distanceKm, 0);
    const l = monthIntervals.reduce((s, iv) => s + iv.liters, 0);
    const value = km > 0 ? Math.round((l / km) * 100 * 10) / 10 : 0;
    return { key, label: MONTHS_SHORT_SR[d.getMonth()], value };
  });

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthEntries = entries.filter((e) => e.date.startsWith(currentMonthKey));

  return {
    intervals,
    avgL100km,
    avgRsdPerKm,
    avgPricePerLiter,
    monthlyL100km,
    currentMonthLiters: currentMonthEntries.reduce((s, e) => s + e.liters, 0),
    currentMonthCost: currentMonthEntries.reduce((s, e) => s + e.amount, 0),
    rangeOnFullTankKm,
  };
}
