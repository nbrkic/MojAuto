import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "mojauto:fuelPricesRS:v2";
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const API_URL = "https://openvan.camp/api/fuel/prices?country=RS&source=mojauto-app";

export type FuelPriceKey = "gasoline" | "diesel" | "lpg" | "cng";

export type FuelPriceRow = {
  key: FuelPriceKey;
  price: number | null;
  change: number | null;
};

export type SerbiaFuelPrices = {
  rows: FuelPriceRow[];
  fetchedAt: string;
};

type CacheEntry = { savedAt: number; prices: SerbiaFuelPrices };

const FUEL_KEYS: FuelPriceKey[] = ["gasoline", "diesel", "lpg", "cng"];

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function parseResponse(json: unknown): SerbiaFuelPrices | null {
  const rs = (json as { data?: { RS?: Record<string, unknown> } })?.data?.RS;
  if (!rs) return null;
  const prices = rs.prices as Record<string, number | null> | undefined;
  const changes = rs.price_changes as Record<string, number | null> | undefined;
  if (!prices) return null;
  return {
    rows: FUEL_KEYS.map((key) => ({ key, price: prices[key] ?? null, change: changes?.[key] ?? null })),
    fetchedAt: (rs.fetched_at as string | undefined) ?? new Date().toISOString(),
  };
}

/**
 * Live Serbian fuel prices (OpenVan.camp, CC BY 4.0 — attribution shown wherever
 * this is rendered). Cached locally since the source refreshes every ~6h and
 * asks not to be polled more than every 10 min; a stale cache is served if the
 * network call fails, so the card doesn't just disappear on a bad connection.
 */
export async function getSerbiaFuelPrices(): Promise<SerbiaFuelPrices | null> {
  const cached = await readCache();
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return cached.prices;
  }

  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    const prices = parseResponse(json);
    if (prices) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), prices } satisfies CacheEntry));
      return prices;
    }
  } catch {
    // fall through to stale cache
  }

  return cached?.prices ?? null;
}
