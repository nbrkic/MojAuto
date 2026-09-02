import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
};

export function TextField({
  label,
  error,
  rightIcon,
  onRightIconPress,
  style,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          error && styles.inputWrapError,
        ]}
      >
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={Colors.textTertiary}
          style={[styles.input, style]}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress} hitSlop={8} disabled={!onRightIconPress}>
            <Icon name={rightIcon} size={19} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: {
    ...Typography.eyebrow,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    paddingHorizontal: Spacing.lg,
  },
  inputWrapFocused: { borderColor: Colors.accent },
  inputWrapError: { borderColor: Colors.danger },
  input: {
    flex: 1,
    paddingVertical: 14,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  error: { ...Typography.caption, color: Colors.danger, marginTop: Spacing.xs },
});
