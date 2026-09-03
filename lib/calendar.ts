import * as Calendar from "expo-calendar";

/**
 * Opens the OS "add event" screen prefilled with a reminder — uses
 * createEventInCalendarAsync so no calendar permission has to be requested;
 * the user reviews and saves it themselves in whichever calendar they pick.
 */
export async function addReminderToDeviceCalendar(
  title: string,
  dueDateKey: string,
  vehicleLabel: string | null,
): Promise<"saved" | "canceled" | "error"> {
  try {
    const [year, month, day] = dueDateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const result = await Calendar.createEventInCalendarAsync({
      title: vehicleLabel ? `${title} — ${vehicleLabel}` : title,
      startDate: date,
      endDate: date,
      allDay: true,
      notes: "Dodato iz MojAuto aplikacije",
    });

    if (result.action === "canceled") return "canceled";
    return "saved";
  } catch {
    return "error";
  }
}
