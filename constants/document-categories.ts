import type { IconName } from "@/components/ui/icon";
import { Colors } from "@/constants/theme";

export type DocumentCategory = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
};

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { key: "Registracija", label: "Registracija", icon: "file-document-outline", color: "#C9A227" },
  { key: "Osiguranje", label: "Osiguranje", icon: "shield-check-outline", color: Colors.success },
  { key: "Servis", label: "Servis", icon: "wrench", color: Colors.accentBright },
  { key: "Ugovor", label: "Ugovor", icon: "handshake-outline", color: "#9C6B3F" },
  { key: "Ostalo", label: "Ostalo", icon: "file-outline", color: Colors.textTertiary },
];

const FALLBACK_CATEGORY: DocumentCategory = DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];

export function getDocumentCategory(key: string | null | undefined): DocumentCategory {
  return DOCUMENT_CATEGORIES.find((c) => c.key === key) ?? FALLBACK_CATEGORY;
}
