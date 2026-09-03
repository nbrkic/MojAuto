import * as SMS from "expo-sms";

export const PARKING_HOUR_MS = 60 * 60 * 1000;

/**
 * Opens the native SMS compose screen prefilled with the parking number and
 * plate — no app can send SMS silently on iOS or Android, so the user still
 * taps Send there. Android's compose intent never reports a real outcome
 * (always "unknown"), only iOS distinguishes cancel from sent.
 */
export async function sendParkingSms(
  phoneNumber: string,
  plate: string,
): Promise<"sent" | "unknown" | "cancelled" | "unavailable"> {
  const available = await SMS.isAvailableAsync();
  if (!available) return "unavailable";
  const { result } = await SMS.sendSMSAsync([phoneNumber], plate);
  return result;
}
