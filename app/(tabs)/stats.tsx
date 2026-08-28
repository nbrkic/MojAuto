import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type CategoryTotal = {
  category: string;
  total: number;
};

const CATEGORY_COLORS = [
  "#208AEF",
  "#4CAF50",
  "#FF9800",
  "#E91E63",
  "#9C27B0",
  "#795548",
];

export default function StatsScreen() {
  const db = useSQLiteContext();
  const [totals, setTotals] = useState<CategoryTotal[]>([]);
  const [overallTotal, setOverallTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      db.getAllAsync<CategoryTotal>(
        `SELECT category, SUM(amount) AS total
         FROM expenses
         GROUP BY category
         ORDER BY total DESC`,
      ).then((rows) => {
        setTotals(rows);
        setOverallTotal(rows.reduce((sum, row) => sum + row.total, 0));
      });
    }, [db]),
  );

  const maxTotal = totals.length > 0 ? totals[0].total : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Statistika</Text>

      {totals.length === 0 ? (
        <Text style={styles.subtitle}>Nema još podataka za statistiku</Text>
      ) : (
        <>
          <Text style={styles.overall}>
            Ukupno: {overallTotal.toFixed(0)} RSD
          </Text>

          <View style={styles.chart}>
            {totals.map((row, index) => {
              const widthPercent =
                maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
              return (
                <View key={row.category} style={styles.barRow}>
                  <Text style={styles.barLabel}>{row.category}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${widthPercent}%`,
                          backgroundColor:
                            CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barAmount}>
                    {row.total.toFixed(0)} RSD
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 16 },
  subtitle: { fontSize: 16, color: "#666" },
  overall: { fontSize: 18, fontWeight: "600", marginBottom: 24 },
  chart: { width: "100%" },
  barRow: { marginBottom: 16 },
  barLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  barTrack: {
    height: 20,
    backgroundColor: "#eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 10,
  },
  barAmount: { fontSize: 13, color: "#666", marginTop: 4 },
});
