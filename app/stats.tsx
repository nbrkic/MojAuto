import { BarChart, type BarDatum } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategory } from "@/constants/categories";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { formatKm, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];

type ExpenseRow = { category: string; amount: number; date: string };

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [totalMileage, setTotalMileage] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([
        supabase.from("expenses").select("category, amount, date"),
        supabase.from("vehicles").select("mileage"),
      ]).then(([expensesRes, vehiclesRes]) => {
        if (!active) return;
        setExpenses((expensesRes.data ?? []) as ExpenseRow[]);
        setTotalMileage((vehiclesRes.data ?? []).reduce((sum, v) => sum + (v.mileage ?? 0), 0));
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryTotals = Array.from(byCategory, ([category, total]) => ({
    category: getCategory(category),
    total,
  })).sort((a, b) => b.total - a.total);

  const monthsBack = 6;
  const now = new Date();
  const monthly: BarDatum[] = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const value = expenses
      .filter((e) => e.date.startsWith(key))
      .reduce((sum, e) => sum + e.amount, 0);
    return { key, label: MONTHS_SHORT[d.getMonth()], value };
  });

  const avgMonthly = totalSpent / monthsBack;

  const statItems: ReadoutItem[] = [
    { key: "total", label: "Ukupno", value: formatRSD(totalSpent), tone: "accent" },
    { key: "avg", label: "Mesečno", value: formatRSD(avgMonthly) },
    { key: "km", label: "Kilometraža", value: formatKm(totalMileage) },
    { key: "count", label: "Troškova", value: String(expenses.length) },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Statistika</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.section}>
          <Skeleton height={70} radius={0} />
          <Skeleton height={200} radius={0} style={{ marginTop: Spacing.lg }} />
        </View>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon="chart-donut"
          title="Nema još podataka"
          subtitle="Dodaj troškove da bi video statistiku potrošnje."
        />
      ) : (
        <>
          <View style={styles.section}>
            <ReadoutStrip items={statItems} />
          </View>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Troškovi po kategoriji</Text>
            <View style={styles.donutRow}>
              <DonutChart
                data={categoryTotals.map((c) => ({ key: c.category.key, value: c.total, color: c.category.color }))}
                centerValue={formatRSD(totalSpent)}
                centerLabel="ukupno"
              />
              <View style={styles.legend}>
                {categoryTotals.map((c) => (
                  <View key={c.category.key} style={styles.legendRow}>
                    <View style={[styles.legendMark, { backgroundColor: c.category.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>
                      {c.category.label}
                    </Text>
                    <Text style={styles.legendValue}>{Math.round((c.total / totalSpent) * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Troškovi po mesecima</Text>
            <BarChart data={monthly} />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  backButton: { width: 32, height: 32, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  section: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.lg },
  donutRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xl },
  legend: { flex: 1, gap: Spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  legendMark: { width: 8, height: 8 },
  legendLabel: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  legendValue: { ...Typography.tag, color: Colors.textPrimary },
});
