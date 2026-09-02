import type { SelectOption } from "@/components/ui/select-field";

export const FUEL_TYPES: SelectOption<string>[] = [
  { value: "Benzin", label: "Benzin", icon: "gas-station" },
  { value: "Dizel", label: "Dizel", icon: "fuel" },
  { value: "Hibrid", label: "Hibrid", icon: "leaf" },
  { value: "Električni", label: "Električni", icon: "car-electric" },
  { value: "Gas (LPG/CNG)", label: "Gas (LPG/CNG)", icon: "propane-tank" },
];

export const TRANSMISSIONS: SelectOption<string>[] = [
  { value: "Manuelni", label: "Manuelni", icon: "car-shift-pattern" },
  { value: "Automatski", label: "Automatski", icon: "car-cog" },
];

export const DRIVETRAINS: SelectOption<string>[] = [
  { value: "Prednji", label: "Prednji (FWD)" },
  { value: "Zadnji", label: "Zadnji (RWD)" },
  { value: "4x4", label: "4x4 (AWD)" },
];

export const YES_NO_OPTIONS: SelectOption<string>[] = [
  { value: "Da", label: "Da" },
  { value: "Ne", label: "Ne" },
];

export const RIM_MATERIALS: SelectOption<string>[] = [
  { value: "Čelik", label: "Čelik" },
  { value: "Alu", label: "Alu" },
];

export const PETROL_GRADES: SelectOption<string>[] = [
  { value: "BMB 95", label: "BMB 95" },
  { value: "BMB 98", label: "BMB 98" },
  { value: "BMB 100", label: "BMB 100" },
  { value: "E5", label: "E5" },
  { value: "E10", label: "E10" },
  { value: "Ostalo", label: "Ostalo" },
];

export const DIESEL_GRADES: SelectOption<string>[] = [
  { value: "Eurodiesel (B7)", label: "Eurodiesel (B7)" },
  { value: "Premium dizel", label: "Premium dizel" },
  { value: "B10", label: "B10" },
  { value: "HVO / XTL", label: "HVO / XTL" },
  { value: "Ostalo", label: "Ostalo" },
];

/** Grade list to offer for a given vehicle fuel type — defaults to petrol grades when unknown/other. */
export function getFuelGrades(vehicleFuelType: string | null | undefined): SelectOption<string>[] {
  return vehicleFuelType === "Dizel" ? DIESEL_GRADES : PETROL_GRADES;
}
