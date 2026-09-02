import { Colors, Radius, Spacing } from "@/constants/theme";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}>;

export function Card({ children, style, onPress, padded = true }: CardProps) {
  const content = [styles.card, padded && styles.padded, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...content, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={content}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  padded: {
    padding: Spacing.lg,
  },
  pressed: {
    opacity: 0.75,
  },
});
