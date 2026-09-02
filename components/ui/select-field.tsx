import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: IconName;
  color?: string;
};

type SelectFieldProps<T extends string | number> = {
  label?: string;
  placeholder: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  sheetTitle?: string;
};

export function SelectField<T extends string | number>({
  label,
  placeholder,
  value,
  options,
  onChange,
  sheetTitle,
}: SelectFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={() => setVisible(true)} style={styles.field}>
        <View style={styles.fieldContent}>
          {selected?.icon && <Icon name={selected.icon} size={18} color={selected.color ?? Colors.textPrimary} />}
          <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
        </View>
        <Icon name="chevron-down" size={20} color={Colors.textSecondary} />
      </Pressable>

      <BottomSheet visible={visible} onClose={() => setVisible(false)} title={sheetTitle ?? label}>
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setVisible(false);
              }}
              style={styles.optionRow}
            >
              {option.icon && <Icon name={option.icon} size={18} color={option.color ?? Colors.textSecondary} />}
              <Text style={styles.optionLabel}>{option.label}</Text>
              {option.value === value && <Icon name="check" size={18} color={Colors.accentBright} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: { ...Typography.eyebrow, color: Colors.textSecondary, marginBottom: Spacing.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  fieldContent: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1, minWidth: 0 },
  value: { ...Typography.body, color: Colors.textPrimary, flexShrink: 1 },
  placeholder: { color: Colors.textTertiary },
  optionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.md },
  optionLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
});
