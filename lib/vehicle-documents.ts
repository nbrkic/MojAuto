import { supabase } from "@/lib/supabase";
import { File } from "expo-file-system";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Uploads a locally-picked document (photo or PDF) to the vehicle-documents
 * bucket and returns its public URL. Reads via expo-file-system rather than
 * fetch().blob() — fetch on a local file:// URI reliably fails with "Network
 * request failed" on Android.
 */
export async function uploadVehicleDocument(localUri: string, userId: string, fileName?: string): Promise<string> {
  const file = new File(localUri);
  const bytes = await file.bytes();
  const source = fileName || localUri;
  const ext = source.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("vehicle-documents").upload(path, bytes, {
    contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("vehicle-documents").getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes the underlying storage object for a document's public URL. */
export async function deleteVehicleDocumentFile(fileUrl: string): Promise<void> {
  const marker = "/vehicle-documents/";
  const index = fileUrl.indexOf(marker);
  if (index === -1) return;
  const path = fileUrl.slice(index + marker.length);
  await supabase.storage.from("vehicle-documents").remove([path]);
}
