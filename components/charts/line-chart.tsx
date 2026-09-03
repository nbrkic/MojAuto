import { Colors, Typography } from "@/constants/theme";
import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line as SvgLine, Path } from "react-native-svg";

export type LinePoint = { key: string; label: string; value: number };

type LineChartProps = {
  data: LinePoint[];
  height?: number;
  color?: string;
};

const PADDING_TOP = 14;
const PADDING_BOTTOM = 22;
const Y_LABEL_WIDTH = 34;

export function LineChart({ data, height = 150, color = Colors.accent }: LineChartProps) {
  const [plotWidth, setPlotWidth] = useState(0);

  function handleLayout(e: LayoutChangeEvent) {
    setPlotWidth(e.nativeEvent.layout.width);
  }

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Nema dovoljno podataka</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = (rawMax - rawMin) * 0.15 || Math.max(rawMax * 0.1, 1);
  const minY = Math.max(0, rawMin - pad);
  const maxY = rawMax + pad;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  function xAt(index: number) {
    if (data.length === 1) return plotWidth / 2;
    return (index / (data.length - 1)) * plotWidth;
  }
  function yAt(value: number) {
    return PADDING_TOP + (1 - (value - minY) / (maxY - minY)) * plotHeight;
  }

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const gridValues = [maxY, (minY + maxY) / 2, minY];

  return (
    <View style={{ height }}>
      <View style={{ flexDirection: "row", flex: 1 }}>
        <View style={{ width: Y_LABEL_WIDTH, height: plotHeight, marginTop: PADDING_TOP }}>
          {gridValues.map((v, i) => (
            <Text
              key={i}
              style={[styles.yLabel, { position: "absolute", top: yAt(v) - PADDING_TOP - 6 }]}
            >
              {v.toFixed(1)}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }} onLayout={handleLayout}>
          {plotWidth > 0 && (
            <Svg width={plotWidth} height={height - PADDING_BOTTOM}>
              {gridValues.map((v, i) => (
                <SvgLine
                  key={i}
                  x1={0}
                  y1={yAt(v)}
                  x2={plotWidth}
                  y2={yAt(v)}
                  stroke={Colors.line}
                  strokeWidth={1}
                />
              ))}
              <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
              ))}
            </Svg>
          )}

          <View style={styles.xLabelsRow}>
            {data.map((d, i) => (
              <Text
                key={d.key}
                numberOfLines={1}
                style={[
                  styles.xLabel,
                  {
                    position: "absolute",
                    left: xAt(i) - 20,
                    width: 40,
                    textAlign: i === 0 ? "left" : i === data.length - 1 ? "right" : "center",
                  },
                ]}
              >
                {d.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  yLabel: { ...Typography.tag, color: Colors.textTertiary, fontSize: 9 },
  xLabelsRow: { height: PADDING_BOTTOM, marginTop: 0 },
  xLabel: { ...Typography.tag, color: Colors.textTertiary, fontSize: 9 },
});
