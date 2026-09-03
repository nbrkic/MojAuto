import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES, getCategory } from "@/constants/categories";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { groupExpensesByMonth } from "@/lib/expense-stats";
import { formatDateNumericSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ExpenseRow = {
  id: number;
  category: string;
  amount: number;
  date: string;
  note: string | null;
  fuel_grade: string | null;
  liters: number | null;
  vehicles: { make: string; model: string } | null;
};

const MONTHS_SR = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    supabase
      .from("expenses")
      .select("id, category, amount, date, note, fuel_grade, liters, vehicles(make, model)")
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        hasLoadedRef.current = true;
        if (error) {
          showToast(error.message, "error");
          setLoading(false);
          return;
        }
        setExpenses((data ?? []) as unknown as ExpenseRow[]);
        setLoading(false);
      });
  }, [showToast]);

  useFocusEffect(load);

  function deleteExpense(id: number) {
    Alert.alert("Obriši trošak?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("expenses").delete().eq("id", id);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          showToast("Trošak obrisan");
          load();
        },
      },
    ]);
  }

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearPrefix = String(now.getFullYear());

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(monthPrefix)),
    [expenses, monthPrefix],
  );
  const yearExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(yearPrefix)),
    [expenses, yearPrefix],
  );

  const periodExpenses = period === "month" ? monthExpenses : yearExpenses;
  const periodTotal = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of periodExpenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return Array.from(map, ([category, total]) => ({ category: getCategory(category), total })).sort(
      (a, b) => b.total - a.total,
    );
  }, [periodExpenses]);

  const monthlyBars = useMemo(() => groupExpensesByMonth(expenses, 6), [expenses]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (!query) return true;
      const haystack = `${e.note ?? ""} ${e.category} ${e.vehicles?.make ?? ""} ${e.vehicles?.model ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [expenses, search, categoryFilter]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: Spacing.xxxl }}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Troškovi</Text>
            <Text style={styles.subtitle}>{MONTHS_SR[now.getMonth()]} {now.getFullYear()}.</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setFilterSheetVisible(true)}
              style={[styles.filterButton, categoryFilter && styles.filterButtonActive]}
            >
              <Icon name="tune-variant" size={19} color={categoryFilter ? Colors.background : Colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => router.push("/add-expense")} style={styles.addButton}>
              <Icon name="plus" size={16} color={Colors.background} />
              <Text style={styles.addButtonText}>Dodaj trošak</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <TextField
            placeholder="Pretraži troškove..."
            value={search}
            onChangeText={setSearch}
            rightIcon="magnify"
            style={{ marginBottom: 0 }}
          />
        </View>

        {loading ? (
          <View style={styles.section}>
            <Skeleton height={180} radius={0} />
          </View>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon="receipt-text-outline"
            title="Još nema troškova"
            subtitle="Počni da pratiš troškove svog automobila."
            actionLabel="+ Dodaj prvi trošak"
            onAction={() => router.push("/add-expense")}
          />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.periodToggle}>
                <Pressable
                  onPress={() => setPeriod("month")}
                  style={[styles.periodButton, period === "month" && styles.periodButtonActive]}
                >
                  <Text style={[styles.periodButtonText, period === "month" && styles.periodButtonTextActive]}>
                    Mesečno
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPeriod("year")}
                  style={[styles.periodButton, period === "year" && styles.periodButtonActive]}
                >
                  <Text style={[styles.periodButtonText, period === "year" && styles.periodButtonTextActive]}>
                    Godišnje
                  </Text>
                </Pressable>
              </View>
            </View>

            {categoryTotals.length > 0 && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {period === "month" ? "Pregled ovog meseca" : "Pregled ove godine"}
                </Text>
                <View style={styles.donutRow}>
                  <DonutChart
                    size={120}
                    strokeWidth={16}
                    data={categoryTotals.map((c) => ({ key: c.category.key, value: c.total, color: c.category.color }))}
                    centerValue={formatRSD(periodTotal)}
                  />
                  <View style={styles.legend}>
                    {categoryTotals.map((c) => (
                      <View key={c.category.key} style={styles.legendRow}>
                        <View style={[styles.legendMark, { backgroundColor: c.category.color }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>{c.category.label}</Text>
                        <Text style={styles.legendValue}>{formatRSD(c.total)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Svi troškovi</Text>
              {filtered.length === 0 ? (
                <Card>
                  <Text style={styles.noResults}>Nema troškova koji odgovaraju pretrazi.</Text>
                </Card>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  {filtered.map((item) => {
                    const cat = getCategory(item.category);
                    return (
                      <Card
                        key={item.id}
                        onPress={() => setSelectedExpense(item)}
                        style={[styles.row, { borderLeftWidth: 2, borderLeftColor: cat.color }]}
                      >
                        <Icon name={cat.icon} size={18} color={cat.color} />
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {item.note?.trim() || cat.label}
                          </Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {formatDateNumericSr(item.date)} · {cat.label}
                            {item.vehicles ? ` · ${item.vehicles.make} ${item.vehicles.model}` : ""}
                          </Text>
                        </View>
                        <Text style={styles.rowAmount}>{formatRSD(item.amount)}</Text>
                        <Pressable onPress={() => deleteExpense(item.id)} hitSlop={8} style={styles.rowDelete}>
                          <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                        </Pressable>
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Troškovi po mesecima</Text>
              <BarChart data={monthlyBars} />
            </Card>
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        title="Filtriraj po kategoriji"
      >
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          <Pressable
            onPress={() => {
              setCategoryFilter(null);
              setFilterSheetVisible(false);
            }}
            style={styles.filterRow}
          >
            <Text style={styles.filterRowText}>Sve kategorije</Text>
            {!categoryFilter && <Icon name="check" size={18} color={Colors.accent} />}
          </Pressable>
          {EXPENSE_CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => {
                setCategoryFilter(c.key);
                setFilterSheetVisible(false);
              }}
              style={styles.filterRow}
            >
              <Icon name={c.icon} size={18} color={c.color} />
              <Text style={styles.filterRowText}>{c.label}</Text>
              {categoryFilter === c.key && <Icon name="check" size={18} color={Colors.accent} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title="Detalji troška"
      >
        {selectedExpense && (
          <View style={{ paddingBottom: Spacing.lg }}>
            <Pressable
              onPress={() => {
                const expenseId = selectedExpense.id;
                setSelectedExpense(null);
                router.push({ pathname: "/add-expense", params: { id: String(expenseId) } });
              }}
              style={styles.editRow}
            >
              <Icon name="pencil-outline" size={18} color={Colors.accent} />
              <Text style={styles.editRowText}>Izmeni trošak</Text>
            </Pressable>
            {[
              { label: "Kategorija", value: getCategory(selectedExpense.category).label },
              { label: "Naziv", value: selectedExpense.note?.trim() || null },
              { label: "Iznos", value: formatRSD(selectedExpense.amount) },
              {
                label: "Vozilo",
                value: selectedExpense.vehicles
                  ? `${selectedExpense.vehicles.make} ${selectedExpense.vehicles.model}`
                  : null,
              },
              { label: "Vrsta goriva", value: selectedExpense.fuel_grade },
              { label: "Broj litara", value: selectedExpense.liters ? `${selectedExpense.liters} l` : null },
              { label: "Datum troška", value: formatDateNumericSr(selectedExpense.date) },
            ]
              .filter((row): row is { label: string; value: string } => !!row.value)
              .map((row, index, all) => (
                <View
                  key={row.label}
                  style={[styles.detailRow, index < all.length - 1 && styles.detailRowDivider]}
                >
                  <Text style={styles.specLabel}>{row.label}</Text>
                  <Text style={styles.specValue}>{row.value}</Text>
                </View>
              ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.eyebrow, color: Colors.textTertiary, marginTop: 6 },
  headerActions: { flexDirection: "row", gap: Spacing.sm },
  filterButton: {
    width: 40,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    height: 40,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  addButtonText: { ...Typography.button, color: Colors.background },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  periodToggle: { flexDirection: "row", gap: Spacing.sm },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
  },
  periodButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  periodButtonText: { ...Typography.tag, color: Colors.textSecondary },
  periodButtonTextActive: { color: Colors.background },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  donutRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xl },
  legend: { flex: 1, gap: Spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  legendMark: { width: 8, height: 8 },
  legendLabel: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  legendValue: { ...Typography.tag, color: Colors.textPrimary },
  noResults: { ...Typography.body, color: Colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md, borderRadius: Radius.sm },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  rowAmount: { ...Typography.statMedium, fontSize: 15, color: Colors.textPrimary },
  rowDelete: { marginLeft: Spacing.sm, padding: 4 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  filterRowText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  detailRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  editRowText: { ...Typography.bodyMedium, color: Colors.accent },
  specLabel: { ...Typography.body, color: Colors.textSecondary },
  specValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
});
