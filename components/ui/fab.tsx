import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/theme";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

type FabProps = {
  label: string;
  icon?: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Fab({ label, icon = "plus", onPress, style }: FabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed, style]}
    >
      <Icon name={icon} size={17} color={Colors.background} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: Spacing.xxl,
    right: Spacing.xxl,
    bottom: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    ...Shadow.floating,
  },
  pressed: { opacity: 0.88 },
  label: { ...Typography.button, color: Colors.background },
});
