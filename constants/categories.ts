import type { IconName } from "@/components/ui/icon";
import { Colors } from "@/constants/theme";

export type ExpenseCategory = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: "Gorivo", label: "Gorivo", icon: "gas-station", color: Colors.accent },
  { key: "Servis", label: "Servis", icon: "wrench", color: Colors.accentBright },
  { key: "Registracija", label: "Registracija", icon: "file-document-outline", color: "#C9A227" },
  { key: "Osiguranje", label: "Osiguranje", icon: "shield-check-outline", color: Colors.success },
  { key: "Gume", label: "Gume", icon: "car-tire-alert", color: "#4A6670" },
  { key: "Delovi", label: "Delovi", icon: "cog-outline", color: "#9C6B3F" },
  { key: "Pranje", label: "Pranje", icon: "car-wash", color: "#5B8FA8" },
  { key: "Parking", label: "Parking", icon: "parking", color: "#8A8563" },
  { key: "Ostalo", label: "Ostalo", icon: "dots-horizontal-circle-outline", color: Colors.textTertiary },
];

const FALLBACK_CATEGORY: ExpenseCategory = EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

export function getCategory(key: string | null | undefined): ExpenseCategory {
  return EXPENSE_CATEGORIES.find((c) => c.key === key) ?? FALLBACK_CATEGORY;
}
