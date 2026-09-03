import { supabase } from "@/lib/supabase";
import { File } from "expo-file-system";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  webp: "image/webp",
};

/**
 * Uploads a locally-picked photo to the vehicle-photos bucket and returns its
 * public URL. Reads the file via expo-file-system rather than fetch().blob()
 * — fetch on a local file:// URI reliably fails with "Network request
 * failed" on Android.
 */
export async function uploadVehiclePhoto(localUri: string, userId: string): Promise<string> {
  const file = new File(localUri);
  const bytes = await file.bytes();
  const ext = localUri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("vehicle-photos").upload(path, bytes, {
    contentType: CONTENT_TYPES[ext] ?? "image/jpeg",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes the underlying storage object for a vehicle photo's public URL. */
export async function deleteVehiclePhotoFile(fileUrl: string): Promise<void> {
  const marker = "/vehicle-photos/";
  const index = fileUrl.indexOf(marker);
  if (index === -1) return;
  const path = fileUrl.slice(index + marker.length);
  await supabase.storage.from("vehicle-photos").remove([path]);
}
