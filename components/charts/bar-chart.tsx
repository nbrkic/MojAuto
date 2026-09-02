import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type BarDatum = { key: string; label: string; value: number };

type BarChartProps = {
  data: BarDatum[];
  height?: number;
  color?: string;
};

function AnimatedBar({ percent, color }: { percent: number; color: string }) {
  const heightValue = useSharedValue(0);

  useEffect(() => {
    heightValue.value = withTiming(percent, { duration: 550 });
  }, [heightValue, percent]);

  const style = useAnimatedStyle(() => ({ height: `${heightValue.value}%` }));

  return <Animated.View style={[styles.barFill, { backgroundColor: color }, style]} />;
}

export function BarChart({ data, height = 140, color = Colors.accent }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height }]}>
      {data.map((datum) => (
        <View key={datum.key} style={styles.column}>
          <View style={styles.track}>
            <AnimatedBar percent={max > 0 ? (datum.value / max) * 100 : 0} color={color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {datum.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm },
  column: { flex: 1, alignItems: "center" },
  track: {
    width: "100%",
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: Radius.sm },
  label: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
});
