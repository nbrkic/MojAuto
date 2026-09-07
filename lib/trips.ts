import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { sendImmediateNotification } from "@/notifications/reminders";
import { supabase } from "@/lib/supabase";

export const TRIP_LOCATION_TASK = "mojauto-trip-location-task";

const ACTIVE_TRIP_KEY = "mojauto:activeTrip";
const ACTIVE_TRIP_POINTS_KEY = "mojauto:activeTripPoints";

export type TripPoint = { lat: number; lng: number; t: number };
export type ActiveTrip = { tripId: number; vehicleId: number; startedAt: string };

export type Trip = {
  id: number;
  vehicle_id: number;
  started_at: string;
  ended_at: string | null;
  distance_m: number | null;
  duration_s: number | null;
  route: TripPoint[] | null;
  status: "active" | "completed";
};

export type StartTripResult =
  | { ok: true; tripId: number }
  | { ok: false; error: "foreground_denied" | "background_denied" | "services_disabled" };

async function readPoints(): Promise<TripPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TRIP_POINTS_KEY);
    return raw ? (JSON.parse(raw) as TripPoint[]) : [];
  } catch {
    return [];
  }
}

async function appendPoints(newPoints: TripPoint[]): Promise<void> {
  const existing = await readPoints();
  await AsyncStorage.setItem(ACTIVE_TRIP_POINTS_KEY, JSON.stringify([...existing, ...newPoints]));
}

/**
 * Registered at module scope (not inside a function) - required by
 * TaskManager, and this module must be imported unconditionally from
 * app/_layout.tsx so the task is defined the instant the JS bundle boots,
 * even when Android/iOS relaunch the app headlessly just to deliver a
 * location update. Points are buffered in AsyncStorage rather than written
 * straight to Supabase, since this callback can fire while the app has no
 * network or is about to be suspended again.
 */
TaskManager.defineTask(TRIP_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.log("[trips] location task error:", error.message);
    return;
  }
  if (!data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  console.log(`[trips] location task received ${locations.length} point(s)`);
  const points: TripPoint[] = locations.map((loc) => ({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    t: loc.timestamp,
  }));
  await appendPoints(points);
});

export function haversineDistance(a: TripPoint, b: TripPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function totalDistance(points: TripPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineDistance(points[i - 1], points[i]);
  return total;
}

export type MapRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

/** Bounding region that fits every point, with padding - null when there's nothing to frame yet. */
export function regionForPoints(points: TripPoint[]): MapRegion | null {
  if (points.length === 0) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.01),
  };
}

/** "1h 24min" / "24min 10s" / "45s" */
export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

/** "850 m" below 1km, "12,4 km" above - trip distances need finer precision than the odometer's whole-km formatKm(). */
export function formatTripDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Reads the in-progress trip pointer, if any - used on screen mount to reattach to a trip started before the app was closed. */
export async function getActiveTrip(): Promise<ActiveTrip | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TRIP_KEY);
    return raw ? (JSON.parse(raw) as ActiveTrip) : null;
  } catch {
    return null;
  }
}

export async function getActiveTripPoints(): Promise<TripPoint[]> {
  return readPoints();
}

export async function startTrip(vehicleId: number): Promise<StartTripResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return { ok: false, error: "foreground_denied" };

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return { ok: false, error: "background_denied" };

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  console.log("[trips] location services enabled:", servicesEnabled);
  if (!servicesEnabled) return { ok: false, error: "services_disabled" };

  const startedAt = new Date();
  const { data, error } = await supabase
    .from("trips")
    .insert({ vehicle_id: vehicleId, started_at: startedAt.toISOString(), status: "active" })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Trip insert failed");

  const active: ActiveTrip = { tripId: data.id, vehicleId, startedAt: startedAt.toISOString() };
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(active));
  await AsyncStorage.setItem(ACTIVE_TRIP_POINTS_KEY, JSON.stringify([]));

  await Location.startLocationUpdatesAsync(TRIP_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 15,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "MojAuto prati putovanje",
      notificationBody: "Praćenje rute je u toku",
    },
  });
  console.log("[trips] startLocationUpdatesAsync resolved, task registered:", await TaskManager.isTaskRegisteredAsync(TRIP_LOCATION_TASK));

  return { ok: true, tripId: data.id };
}

export async function stopTrip(): Promise<Trip> {
  const active = await getActiveTrip();
  if (!active) throw new Error("Nema aktivnog putovanja.");

  const started = await Location.hasStartedLocationUpdatesAsync(TRIP_LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(TRIP_LOCATION_TASK);

  const points = await readPoints();
  const distanceM = totalDistance(points);
  const endedAt = new Date();
  const durationS = Math.round((endedAt.getTime() - new Date(active.startedAt).getTime()) / 1000);

  const { data, error } = await supabase
    .from("trips")
    .update({
      ended_at: endedAt.toISOString(),
      distance_m: Math.round(distanceM),
      duration_s: durationS,
      route: points,
      status: "completed",
    })
    .eq("id", active.tripId)
    .select("*")
    .single();

  await AsyncStorage.removeItem(ACTIVE_TRIP_KEY);
  await AsyncStorage.removeItem(ACTIVE_TRIP_POINTS_KEY);

  if (error || !data) throw error ?? new Error("Trip update failed");

  sendImmediateNotification(
    "Putovanje završeno",
    `${(distanceM / 1000).toFixed(1)} km · ${formatDurationShort(durationS)}`,
  );

  return data as Trip;
}

export async function listTrips(vehicleId: number): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, vehicle_id, started_at, ended_at, distance_m, duration_s, route, status")
    .eq("vehicle_id", vehicleId)
    .eq("status", "completed")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function getTrip(id: number): Promise<Trip> {
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Trip;
}

export async function deleteTrip(id: number): Promise<void> {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}
