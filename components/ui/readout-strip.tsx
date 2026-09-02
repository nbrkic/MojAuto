import { Colors, Typography } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

export type ReadoutTone = "default" | "accent" | "success" | "warning" | "danger";

const TONE_COLORS: Record<ReadoutTone, string> = {
  default: Colors.textPrimary,
  accent: Colors.accentBright,
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
};

export type ReadoutItem = {
  key: string;
  label: string;
  value: string;
  tone?: ReadoutTone;
};

/**
 * A horizontal instrument-panel readout — hairline-divided cells instead of
 * a grid of separately-carded "stat tiles".
 */
export function ReadoutStrip({ items }: { items: ReadoutItem[] }) {
  return (
    <View style={styles.strip}>
      {items.map((item, index) => (
        <View
          key={item.key}
          style={[styles.cell, index < items.length - 1 && styles.cellDivider]}
        >
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text
            style={[styles.value, { color: TONE_COLORS[item.tone ?? "default"] }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  cell: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 12 },
  cellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.line,
  },
  label: { ...Typography.tag, color: Colors.textTertiary, marginBottom: 8 },
  value: { ...Typography.statMedium },
});
