import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { CutCornerCard } from "@/components/ui/cut-corner-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { daysUntil, formatNumberSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SELECTED_VEHICLE_KEY = "mojauto:selectedVehicleId";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  mileage: number;
};

type ReminderRow = { id: number; title: string; due_date: string };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Dobro jutro";
  if (hour < 18) return "Dobar dan";
  return "Dobro veče";
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);

  const [monthTotal, setMonthTotal] = useState(0);
  const [fuelTotal, setFuelTotal] = useState(0);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [otherTotal, setOtherTotal] = useState(0);
  const [upcoming, setUpcoming] = useState<ReminderRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      (async () => {
        const [{ data: vehicleData }, storedId] = await Promise.all([
          supabase.from("vehicles").select("*").order("id", { ascending: false }),
          AsyncStorage.getItem(SELECTED_VEHICLE_KEY),
        ]);
        if (!active) return;

        const list = vehicleData ?? [];
        setVehicles(list);

        const parsedStoredId = storedId ? Number(storedId) : null;
        const activeId =
          parsedStoredId && list.some((v) => v.id === parsedStoredId)
            ? parsedStoredId
            : (list[0]?.id ?? null);
        setSelectedId(activeId);

        if (!activeId) {
          setLoading(false);
          return;
        }

        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const [{ data: expenseData }, { data: reminderData }] = await Promise.all([
          supabase
            .from("expenses")
            .select("category, amount, date")
            .eq("vehicle_id", activeId)
            .gte("date", `${monthPrefix}-01`),
          supabase
            .from("reminders")
            .select("id, title, due_date")
            .eq("vehicle_id", activeId)
            .eq("is_done", false)
            .order("due_date", { ascending: true })
            .limit(4),
        ]);
        if (!active) return;

        let fuel = 0;
        let service = 0;
        let other = 0;
        for (const e of expenseData ?? []) {
          if (e.category === "Gorivo") fuel += e.amount;
          else if (e.category === "Servis") service += e.amount;
          else other += e.amount;
        }
        setFuelTotal(fuel);
        setServiceTotal(service);
        setOtherTotal(other);
        setMonthTotal(fuel + service + other);
        setUpcoming(reminderData ?? []);
        setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  async function selectVehicle(id: number) {
    setSelectedId(id);
    setSwitcherVisible(false);
    await AsyncStorage.setItem(SELECTED_VEHICLE_KEY, String(id));
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) ?? null;

  const overviewItems: ReadoutItem[] = [
    { key: "month", label: "Ovaj mesec", value: formatRSD(monthTotal), tone: "accent" },
    { key: "fuel", label: "Gorivo", value: formatRSD(fuelTotal) },
    { key: "service", label: "Servis", value: formatRSD(serviceTotal) },
    { key: "other", label: "Ostalo", value: formatRSD(otherTotal) },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingLabel}>{greeting()}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {session?.user?.email}
            </Text>
          </View>
          <View style={styles.brandMark}>
            <Icon name="car-side" size={18} color={Colors.accent} />
          </View>
        </View>

        {loading ? (
          <View style={styles.section}>
            <Skeleton height={170} radius={0} />
          </View>
        ) : !selectedVehicle ? (
          <EmptyState
            icon="car-side"
            title="Još nemaš dodato vozilo"
            subtitle="Dodaj svoje prvo vozilo da bi počeo da pratiš troškove i servise."
            actionLabel="+ Dodaj vozilo"
            onAction={() => router.push("/add-vehicle")}
          />
        ) : (
          <>
            <View style={styles.section}>
              <Pressable onPress={() => router.push(`/vehicle/${selectedVehicle.id}`)}>
                <CutCornerCard>
                  <View style={styles.plateRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehEyebrow}>Trenutno vozilo</Text>
                      <Text style={styles.vehicleName}>
                        {selectedVehicle.make} {selectedVehicle.model}
                      </Text>
                      <Text style={styles.vehicleMeta}>{selectedVehicle.year}</Text>
                    </View>
                    {selectedVehicle.license_plate && (
                      <View style={styles.plateBadge}>
                        <Text style={styles.plateText}>{selectedVehicle.license_plate}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.odoRow}>
                    <Text style={styles.odoValue}>{formatNumberSr(selectedVehicle.mileage)}</Text>
                    <Text style={styles.odoUnit}>km</Text>
                  </View>
                  <Text style={styles.odoLabel}>Trenutna kilometraža</Text>

                  {vehicles.length > 1 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSwitcherVisible(true);
                      }}
                      style={styles.switcherButton}
                      hitSlop={8}
                    >
                      <Text style={styles.switcherText}>Promeni vozilo</Text>
                      <Icon name="chevron-down" size={14} color={Colors.accent} />
                    </Pressable>
                  )}
                </CutCornerCard>
              </Pressable>
            </View>

            <View style={styles.section}>
              <ReadoutStrip items={overviewItems} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Uskoro</Text>
              {upcoming.length === 0 ? (
                <Card>
                  <Text style={styles.emptyUpcoming}>Nema predstojećih obaveza za ovo vozilo.</Text>
                </Card>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  {upcoming.map((r) => {
                    const days = daysUntil(r.due_date);
                    const overdue = days < 0;
                    const soon = days >= 0 && days <= 7;
                    const tone = overdue ? Colors.danger : soon ? Colors.warning : Colors.accent;
                    const statusText = overdue
                      ? "Isteklo"
                      : days === 0
                        ? "Danas"
                        : `Za ${days} ${days === 1 ? "dan" : "dana"}`;
                    return (
                      <Card key={r.id} style={styles.reminderRow}>
                        <View style={[styles.reminderMark, { backgroundColor: tone }]} />
                        <Text style={styles.reminderTitle} numberOfLines={1}>
                          {r.title}
                        </Text>
                        <Text style={[styles.reminderStatus, { color: tone }]}>{statusText}</Text>
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BottomSheet
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        title="Izaberi vozilo"
      >
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          {vehicles.map((v) => (
            <Pressable key={v.id} onPress={() => selectVehicle(v.id)} style={styles.switcherRow}>
              <Icon name="car-side" size={18} color={Colors.textSecondary} />
              <Text style={styles.switcherRowText}>
                {v.make} {v.model}
              </Text>
              {v.id === selectedId && <Icon name="check" size={18} color={Colors.accent} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  greetingLabel: { ...Typography.eyebrow, color: Colors.textTertiary, marginBottom: 6 },
  email: { ...Typography.h2, color: Colors.textPrimary, maxWidth: 260 },
  brandMark: {
    width: 36,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  plateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  vehEyebrow: { ...Typography.eyebrow, color: Colors.textTertiary, marginBottom: 6 },
  vehicleName: { ...Typography.h1, color: Colors.textPrimary },
  vehicleMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  plateBadge: {
    borderWidth: 1,
    borderColor: Colors.accentDeep,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  plateText: { ...Typography.tag, color: Colors.accentBright, letterSpacing: 1 },
  odoRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: Spacing.xl },
  odoValue: { ...Typography.statLarge, color: Colors.textPrimary, fontSize: 40, lineHeight: 42 },
  odoUnit: { ...Typography.caption, fontFamily: Typography.eyebrow.fontFamily, color: Colors.textSecondary },
  odoLabel: { ...Typography.tag, color: Colors.textTertiary, marginTop: 4 },
  switcherButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: Spacing.lg,
  },
  switcherText: { ...Typography.tag, color: Colors.accent },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyUpcoming: { ...Typography.body, color: Colors.textSecondary },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  reminderMark: { width: 3, height: 20 },
  reminderTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  reminderStatus: { ...Typography.tag },
  switcherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  switcherRowText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
});
