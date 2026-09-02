import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: Colors.background,
  secondary: Colors.textPrimary,
  ghost: Colors.textPrimary,
  danger: Colors.danger,
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = TEXT_COLOR[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={16} color={textColor} style={styles.icon} />}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  fullWidth: { alignSelf: "stretch" },
  primary: { backgroundColor: Colors.accent },
  secondary: { backgroundColor: "transparent", borderColor: Colors.lineStrong },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: "transparent", borderColor: Colors.danger },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
  icon: { marginRight: Spacing.sm },
  text: { ...Typography.button },
});
