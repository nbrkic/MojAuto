import type { SelectOption } from "@/components/ui/select-field";

export const NOTIFY_DAYS_BEFORE_OPTIONS: SelectOption<number>[] = [
  { value: 0, label: "Na dan roka" },
  { value: 1, label: "1 dan pre" },
  { value: 3, label: "3 dana pre" },
  { value: 7, label: "7 dana pre" },
  { value: 14, label: "14 dana pre" },
  { value: 30, label: "30 dana pre" },
];
