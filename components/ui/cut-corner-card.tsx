import { Colors, Spacing } from "@/constants/theme";
import { useState, type PropsWithChildren } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";

type CutCornerCardProps = PropsWithChildren<{
  cut?: number;
  accentColor?: string;
  fill?: string;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * The signature "instrument panel" surface: bottom-right corner cut at an
 * angle, a solid accent rule down the left edge, and a faint gauge-ring
 * watermark — built on react-native-svg since RN has no clip-path.
 */
export function CutCornerCard({
  children,
  cut = 24,
  accentColor = Colors.accent,
  fill = Colors.surface,
  style,
}: CutCornerCardProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          <Polygon
            points={`0,0 ${size.width},0 ${size.width},${size.height - cut} ${size.width - cut},${size.height} 0,${size.height}`}
            fill={fill}
            stroke={Colors.line}
            strokeWidth={1}
          />
          <Circle cx={size.width - 6} cy={6} r={64} stroke={accentColor} strokeOpacity={0.06} strokeWidth={18} fill="none" />
          <Circle cx={size.width - 6} cy={6} r={92} stroke={accentColor} strokeOpacity={0.04} strokeWidth={18} fill="none" />
          <Polygon points={`0,0 0,${size.height} 3,${size.height} 3,0`} fill={accentColor} />
        </Svg>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  content: { padding: Spacing.xl },
});
