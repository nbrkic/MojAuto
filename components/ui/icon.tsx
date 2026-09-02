import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";
import type { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type IconProps = {
  name: IconName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
};

/**
 * Single icon language for the whole app (MaterialCommunityIcons — best
 * automotive icon coverage of the bundled @expo/vector-icons sets), so every
 * screen reads consistently instead of mixing SF Symbols / Material icons.
 */
export function Icon({ name, size = 24, color, style }: IconProps) {
  return (
    <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
  );
}
