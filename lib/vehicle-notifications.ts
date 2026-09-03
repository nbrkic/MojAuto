import { toDateKey } from "@/lib/format";
import { sendImmediateNotification } from "@/notifications/reminders";
import { supabase } from "@/lib/supabase";

export const MALI_SERVIS_INTERVAL_KM = 10_000;
export const VELIKI_SERVIS_INTERVAL_KM = 60_000;

/** The next annual anniversary of `lastDateKey` ("YYYY-MM-DD") that's still in the future. */
export function nextAnnualDueDate(lastDateKey: string): string {
  const [y, m, d] = lastDateKey.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = y + 1;
  let candidate = new Date(year, m - 1, d);
  while (candidate.getTime() <= today.getTime()) {
    year += 1;
    candidate = new Date(year, m - 1, d);
  }
  return toDateKey(candidate);
}

/** The next occurrence (this year or next) of a fixed month/day, at 09:00. */
export function nextMonthDayOccurrence(month: number, day: number): Date {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month - 1, day, 9, 0, 0);
  if (thisYear.getTime() > now.getTime()) return thisYear;
  return new Date(now.getFullYear() + 1, month - 1, day, 9, 0, 0);
}

type ServisSettings = {
  mali_servis_enabled: boolean;
  mali_servis_last_km: number | null;
  veliki_servis_enabled: boolean;
  veliki_servis_last_km: number | null;
};

/**
 * Compares mileage before/after an update against the mali/veliki servis
 * thresholds and fires a local notification for whichever interval was just
 * crossed by this specific update (so it fires once, not on every later save).
 */
export async function checkMileageServiceDue(
  vehicleId: number,
  vehicleName: string,
  previousMileage: number,
  newMileage: number,
) {
  const { data } = await supabase
    .from("vehicle_notification_settings")
    .select("mali_servis_enabled, mali_servis_last_km, veliki_servis_enabled, veliki_servis_last_km")
    .eq("vehicle_id", vehicleId)
    .maybeSingle<ServisSettings>();

  if (!data) return;

  if (data.mali_servis_enabled && data.mali_servis_last_km !== null) {
    const threshold = data.mali_servis_last_km + MALI_SERVIS_INTERVAL_KM;
    if (previousMileage < threshold && newMileage >= threshold) {
      await sendImmediateNotification("Mali servis", `${vehicleName} — vreme je za mali servis`);
    }
  }

  if (data.veliki_servis_enabled && data.veliki_servis_last_km !== null) {
    const threshold = data.veliki_servis_last_km + VELIKI_SERVIS_INTERVAL_KM;
    if (previousMileage < threshold && newMileage >= threshold) {
      await sendImmediateNotification("Veliki servis", `${vehicleName} — vreme je za veliki servis`);
    }
  }
}
