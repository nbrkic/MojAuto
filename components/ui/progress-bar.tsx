import { Colors } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

type ProgressBarProps = {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({
  progress,
  color = Colors.accent,
  trackColor = Colors.surfaceRaised,
  height = 6,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%" },
});
