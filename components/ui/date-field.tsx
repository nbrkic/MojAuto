import { Icon } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { formatDateLongSr, toDateKey } from "@/lib/format";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./button";

type DateFieldProps = {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  const [visible, setVisible] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setVisible(false);
    if (event.type === "set" && selected) onChange(selected);
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={() => setVisible(true)} style={styles.field}>
        <Text style={styles.value}>{formatDateLongSr(toDateKey(value))}</Text>
        <Icon name="calendar-month-outline" size={20} color={Colors.textSecondary} />
      </Pressable>

      {visible && (
        <>
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleChange}
            themeVariant="dark"
            maximumDate={maximumDate}
          />
          {Platform.OS === "ios" && (
            <Button title="Gotovo" variant="secondary" onPress={() => setVisible(false)} style={styles.doneButton} />
          )}
        </>
      )}
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
  value: { ...Typography.body, color: Colors.textPrimary },
  doneButton: { marginTop: Spacing.sm },
});
