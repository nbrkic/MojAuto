import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CutCornerCard } from "@/components/ui/cut-corner-card";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getCategory } from "@/constants/categories";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { daysUntil, formatDateNumericSr, formatNumberSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  mileage: number;
};

type ExpenseRow = { id: number; category: string; amount: number; date: string; note: string | null };
type ReminderRow = { id: number; title: string; due_date: string };

export default function VehicleDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([
        supabase.from("vehicles").select("*").eq("id", vehicleId).single(),
        supabase
          .from("expenses")
          .select("id, category, amount, date, note")
          .eq("vehicle_id", vehicleId)
          .order("date", { ascending: false }),
        supabase
          .from("reminders")
          .select("id, title, due_date")
          .eq("vehicle_id", vehicleId)
          .eq("is_done", false)
          .order("due_date", { ascending: true })
          .limit(5),
      ]).then(([vehicleRes, expenseRes, reminderRes]) => {
        if (!active) return;
        if (vehicleRes.error || !vehicleRes.data) {
          showToast("Vozilo nije pronađeno", "error");
          router.back();
          return;
        }
        setVehicle(vehicleRes.data);
        setExpenses(expenseRes.data ?? []);
        setReminders(reminderRes.data ?? []);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [vehicleId, router, showToast]),
  );

  function handleDelete() {
    Alert.alert("Obriši vozilo?", "Ovo će obrisati i sve njegove troškove i podsetnike.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          showToast("Vozilo obrisano");
          router.back();
        },
      },
    ]);
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgMonthly = totalSpent / 6;

  const statItems: ReadoutItem[] = [
    { key: "total", label: "Ukupno", value: formatRSD(totalSpent), tone: "accent" },
    { key: "avg", label: "Mesečno", value: formatRSD(avgMonthly) },
    { key: "count", label: "Troškova", value: String(expenses.length) },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
          <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{vehicle ? `${vehicle.make} ${vehicle.model}` : ""}</Text>
        <Pressable
          onPress={() => router.push({ pathname: "/add-vehicle", params: { id: String(vehicleId) } })}
          hitSlop={8}
          style={styles.headerButton}
        >
          <Icon name="pencil-outline" size={21} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {loading || !vehicle ? (
        <View style={styles.section}>
          <Skeleton height={150} radius={0} />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <CutCornerCard>
              <Text style={styles.heroEyebrow}>Podaci o vozilu</Text>
              <Text style={styles.heroName}>{vehicle.make} {vehicle.model}</Text>
              <Text style={styles.heroMeta}>{vehicle.year}</Text>
              <View style={styles.heroFooter}>
                <View style={styles.odoRow}>
                  <Text style={styles.odoValue}>{formatNumberSr(vehicle.mileage)}</Text>
                  <Text style={styles.odoUnit}>km</Text>
                </View>
                {vehicle.license_plate && (
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{vehicle.license_plate}</Text>
                  </View>
                )}
              </View>
            </CutCornerCard>
          </View>

          <View style={styles.section}>
            <ReadoutStrip items={statItems} />
          </View>

          {reminders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Predstoji</Text>
              <View style={{ gap: Spacing.sm }}>
                {reminders.map((r) => {
                  const days = daysUntil(r.due_date);
                  const overdue = days < 0;
                  return (
                    <Card key={r.id} style={styles.listRow}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={[styles.listRowMeta, overdue && { color: Colors.danger }]}>
                        {overdue ? "Isteklo" : formatDateNumericSr(r.due_date)}
                      </Text>
                    </Card>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nedavni troškovi</Text>
            {expenses.length === 0 ? (
              <Card>
                <Text style={styles.listRowMeta}>Još nema troškova za ovo vozilo.</Text>
              </Card>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {expenses.slice(0, 6).map((e) => {
                  const cat = getCategory(e.category);
                  return (
                    <Card key={e.id} style={[styles.expenseRow, { borderLeftWidth: 2, borderLeftColor: cat.color }]}>
                      <Icon name={cat.icon} size={16} color={cat.color} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.listRowTitle} numberOfLines={1}>{e.note?.trim() || cat.label}</Text>
                        <Text style={styles.listRowMeta}>{formatDateNumericSr(e.date)}</Text>
                      </View>
                      <Text style={styles.listRowTitle}>{formatRSD(e.amount)}</Text>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Button title="Obriši vozilo" variant="danger" onPress={handleDelete} />
          </View>
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
  headerButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary, flex: 1, textAlign: "center" },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  heroEyebrow: { ...Typography.eyebrow, color: Colors.textTertiary, marginBottom: 6 },
  heroName: { ...Typography.h1, color: Colors.textPrimary },
  heroMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  heroFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.xl,
  },
  odoRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  odoValue: { ...Typography.statLarge, color: Colors.textPrimary },
  odoUnit: { ...Typography.caption, fontFamily: Typography.eyebrow.fontFamily, color: Colors.textSecondary },
  plateBadge: {
    borderWidth: 1,
    borderColor: Colors.accentDeep,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  plateText: { ...Typography.tag, color: Colors.accentBright, letterSpacing: 1 },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  listRowMeta: { ...Typography.caption, color: Colors.textSecondary },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
});
