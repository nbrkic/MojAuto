import { supabase } from "@/lib/supabase";
import { deleteVehicleDocumentFile } from "@/lib/vehicle-documents";
import { deleteVehiclePhotoFile } from "@/lib/vehicle-photos";

/**
 * Removes storage files (photo + documents) belonging to a vehicle. DB rows
 * (expenses, reminders, documents, parking shortcuts, notification settings)
 * cascade automatically via FK constraints when the vehicle row is deleted,
 * but storage objects don't — call this BEFORE deleting the vehicle, while
 * its document rows still exist to read their file_url from.
 */
export async function cleanupVehicleFiles(vehicleId: number): Promise<void> {
  const [{ data: vehicle }, { data: documents }] = await Promise.all([
    supabase.from("vehicles").select("photo_url").eq("id", vehicleId).single(),
    supabase.from("documents").select("file_url").eq("vehicle_id", vehicleId),
  ]);

  const tasks: Promise<void>[] = [];
  if (vehicle?.photo_url) tasks.push(deleteVehiclePhotoFile(vehicle.photo_url));
  for (const doc of documents ?? []) tasks.push(deleteVehicleDocumentFile(doc.file_url));
  await Promise.all(tasks);
}
