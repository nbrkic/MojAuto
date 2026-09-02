import { Colors, Typography } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export type DonutSlice = { key: string; value: number; color: string };

type DonutChartProps = {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
};

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 20,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const center = size / 2;

  let cumulativeFraction = 0;
  const segments = data
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const fraction = total > 0 ? slice.value / total : 0;
      const dashArray = `${circumference * fraction} ${circumference}`;
      const dashOffset = -cumulativeFraction * circumference;
      cumulativeFraction += fraction;
      return { ...slice, dashArray, dashOffset };
    });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={Colors.surfaceRaised}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((segment) => (
            <Circle
              key={segment.key}
              cx={center}
              cy={center}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
              fill="none"
            />
          ))}
        </G>
      </Svg>
      {(centerValue || centerLabel) && (
        <View style={styles.center} pointerEvents="none">
          {centerValue && (
            <Text style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit>
              {centerValue}
            </Text>
          )}
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  centerValue: { ...Typography.statMedium, color: Colors.textPrimary },
  centerLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});
