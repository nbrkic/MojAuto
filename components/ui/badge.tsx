import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

export type BadgeTone = "accent" | "success" | "warning" | "danger" | "neutral";

const TONE_COLORS: Record<BadgeTone, string> = {
  accent: Colors.accentBright,
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
  neutral: Colors.textSecondary,
};

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
};

/** A bracket-tag status marker — bordered, no fill, mono uppercase. */
export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const color = TONE_COLORS[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      {icon && <Icon name={icon} size={11} color={color} style={styles.icon} />}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { marginRight: 4 },
  text: { ...Typography.tag },
});
