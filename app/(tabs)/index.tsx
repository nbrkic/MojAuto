import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CutCornerCard } from "@/components/ui/cut-corner-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { computeFuelStats, type FuelEntry } from "@/lib/fuel-stats";
import { daysUntil, formatNumberSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { checkMileageServiceDue } from "@/lib/vehicle-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
  photo_url: string | null;
  avg_consumption_l100km: number | null;
  tank_capacity_l: number | null;
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
  const showToast = useToast();
  const displayName =
    session?.user?.user_metadata?.first_name || session?.user?.email?.split("@")[0] || "";

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [mileageSheetVisible, setMileageSheetVisible] = useState(false);
  const [mileageInput, setMileageInput] = useState("");
  const [savingMileage, setSavingMileage] = useState(false);
  const [consumptionSheetVisible, setConsumptionSheetVisible] = useState(false);
  const [consumptionInput, setConsumptionInput] = useState("");
  const [savingConsumption, setSavingConsumption] = useState(false);

  const [monthTotal, setMonthTotal] = useState(0);
  const [fuelTotal, setFuelTotal] = useState(0);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [otherTotal, setOtherTotal] = useState(0);
  const [upcoming, setUpcoming] = useState<ReminderRow[]>([]);
  const [computedL100km, setComputedL100km] = useState<number | null>(null);
  const hasLoadedRef = useRef(false);

  const loadVehicleStats = useCallback(async (activeId: number) => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [{ data: expenseData }, { data: reminderData }, { data: fuelData }] = await Promise.all([
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
      supabase
        .from("expenses")
        .select("id, date, amount, liters, mileage_at_fillup, is_full_tank")
        .eq("vehicle_id", activeId)
        .eq("category", "Gorivo")
        .not("mileage_at_fillup", "is", null)
        .not("liters", "is", null),
    ]);

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
    setComputedL100km(computeFuelStats((fuelData as FuelEntry[]) ?? [], null).avgL100km);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasLoadedRef.current) setLoading(true);

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
          hasLoadedRef.current = true;
          setLoading(false);
          return;
        }

        await loadVehicleStats(activeId);
        if (!active) return;
        hasLoadedRef.current = true;
        setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, [loadVehicleStats]),
  );

  async function selectVehicle(id: number) {
    setSelectedId(id);
    setSwitcherVisible(false);
    await AsyncStorage.setItem(SELECTED_VEHICLE_KEY, String(id));
    loadVehicleStats(id);
  }

  function openMileageSheet(vehicle: Vehicle) {
    setMileageInput(String(vehicle.mileage));
    setMileageSheetVisible(true);
  }

  async function handleUpdateMileage() {
    if (!selectedVehicle) return;
    const newMileage = Number(mileageInput);
    if (!Number.isFinite(newMileage) || newMileage < 0) {
      showToast("Unesi ispravnu kilometražu", "error");
      return;
    }
    const previousMileage = selectedVehicle.mileage;

    setSavingMileage(true);
    const { error } = await supabase
      .from("vehicles")
      .update({ mileage: newMileage })
      .eq("id", selectedVehicle.id);
    setSavingMileage(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }
    setVehicles((prev) =>
      prev.map((v) => (v.id === selectedVehicle.id ? { ...v, mileage: newMileage } : v)),
    );
    setMileageSheetVisible(false);
    showToast("Kilometraža ažurirana");

    checkMileageServiceDue(
      selectedVehicle.id,
      `${selectedVehicle.make} ${selectedVehicle.model}`,
      previousMileage,
      newMileage,
    );
  }

  function openConsumptionSheet(vehicle: Vehicle) {
    setConsumptionInput(
      vehicle.avg_consumption_l100km !== null ? String(vehicle.avg_consumption_l100km) : "",
    );
    setConsumptionSheetVisible(true);
  }

  async function handleUpdateConsumption() {
    if (!selectedVehicle) return;
    const newConsumption = Number(consumptionInput.replace(",", "."));
    if (!Number.isFinite(newConsumption) || newConsumption < 0) {
      showToast("Unesi ispravnu potrošnju", "error");
      return;
    }

    setSavingConsumption(true);
    const { error } = await supabase
      .from("vehicles")
      .update({ avg_consumption_l100km: newConsumption })
      .eq("id", selectedVehicle.id);
    setSavingConsumption(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehicle.id ? { ...v, avg_consumption_l100km: newConsumption } : v,
      ),
    );
    setConsumptionSheetVisible(false);
    showToast("Potrošnja ažurirana");
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
            <Text style={styles.name} numberOfLines={1}>
              {greeting()}, {displayName}
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
            {selectedVehicle.photo_url && (
              <Pressable
                onPress={() => router.push(`/vehicle/${selectedVehicle.id}`)}
                style={styles.section}
              >
                <Image source={{ uri: selectedVehicle.photo_url }} style={styles.photo} contentFit="cover" />
              </Pressable>
            )}

            <View style={styles.section}>
              <Pressable
                onPress={() => router.push(`/vehicle/${selectedVehicle.id}`)}
                style={({ pressed }) => [pressed && styles.cardPressed]}
              >
                <CutCornerCard>
                  <View style={styles.plateRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehEyebrow}>Trenutno vozilo</Text>
                      <Text style={styles.vehicleName}>
                        {selectedVehicle.make} {selectedVehicle.model}
                      </Text>
                      <Text style={styles.vehicleMeta}>{selectedVehicle.year}</Text>
                    </View>
                    <View style={styles.cardTopRight}>
                      <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
                      {selectedVehicle.license_plate && (
                        <View style={styles.plateBadge}>
                          <Text style={styles.plateText}>{selectedVehicle.license_plate}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.odoHeader}>
                    <View style={styles.odoRow}>
                      <Text style={styles.odoValue}>{formatNumberSr(selectedVehicle.mileage)}</Text>
                      <Text style={styles.odoUnit}>km</Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        openMileageSheet(selectedVehicle);
                      }}
                      hitSlop={8}
                      style={styles.odoEditButton}
                    >
                      <Icon name="pencil-outline" size={15} color={Colors.accent} />
                    </Pressable>
                  </View>
                  <Text style={styles.odoLabel}>Trenutna kilometraža</Text>

                  <View style={styles.cardFooterRow}>
                    {vehicles.length > 1 ? (
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
                    ) : (
                      <View />
                    )}
                    <View style={styles.detailsHint}>
                      <Text style={styles.detailsHintText}>Detalji</Text>
                      <Icon name="chevron-right" size={14} color={Colors.textTertiary} />
                    </View>
                  </View>
                </CutCornerCard>
              </Pressable>
            </View>

            <View style={styles.section}>
              {computedL100km !== null ? (
                <Pressable onPress={() => router.push({ pathname: "/fuel-consumption", params: { id: String(selectedVehicle.id) } })}>
                  <View style={styles.consumptionInline}>
                    <Text style={styles.consumptionValue}>{computedL100km.toFixed(1)}</Text>
                    <Text style={styles.consumptionUnit}>L/100km</Text>
                    <Icon name="chevron-right" size={16} color={Colors.textTertiary} style={{ marginLeft: 2 }} />
                  </View>
                  <Text style={styles.consumptionLabel}>Prosečna potrošnja · izračunato</Text>
                </Pressable>
              ) : (
                <>
                  <View style={styles.consumptionInline}>
                    <Text style={styles.consumptionValue}>
                      {selectedVehicle.avg_consumption_l100km !== null
                        ? selectedVehicle.avg_consumption_l100km
                        : "—"}
                    </Text>
                    <Text style={styles.consumptionUnit}>L/100km</Text>
                    <Pressable
                      onPress={() => openConsumptionSheet(selectedVehicle)}
                      hitSlop={8}
                      style={styles.consumptionEditButton}
                    >
                      <Icon name="pencil-outline" size={15} color={Colors.accent} />
                    </Pressable>
                  </View>
                  <Text style={styles.consumptionLabel}>Prosečna potrošnja</Text>
                </>
              )}
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

      <BottomSheet
        visible={mileageSheetVisible}
        onClose={() => setMileageSheetVisible(false)}
        title="Ažuriraj kilometražu"
      >
        <View style={{ paddingBottom: Spacing.lg }}>
          <TextField
            label="Nova kilometraža"
            placeholder="npr. 142350"
            value={mileageInput}
            onChangeText={setMileageInput}
            keyboardType="number-pad"
            autoFocus
          />
          <Button
            title="Sačuvaj"
            onPress={handleUpdateMileage}
            disabled={!mileageInput.trim()}
            loading={savingMileage}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={consumptionSheetVisible}
        onClose={() => setConsumptionSheetVisible(false)}
        title="Ažuriraj potrošnju"
      >
        <View style={{ paddingBottom: Spacing.lg }}>
          <TextField
            label="Prosečna potrošnja (L/100km)"
            placeholder="npr. 6.8"
            value={consumptionInput}
            onChangeText={setConsumptionInput}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Button
            title="Sačuvaj"
            onPress={handleUpdateConsumption}
            disabled={!consumptionInput.trim()}
            loading={savingConsumption}
          />
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
  name: { ...Typography.h2, color: Colors.textPrimary, maxWidth: 260 },
  brandMark: {
    width: 36,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  cardPressed: { opacity: 0.85 },
  plateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  vehEyebrow: { ...Typography.eyebrow, color: Colors.textTertiary, marginBottom: 6 },
  vehicleName: { ...Typography.h1, color: Colors.textPrimary },
  vehicleMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  cardTopRight: { alignItems: "flex-end", gap: Spacing.sm },
  plateBadge: {
    borderWidth: 1,
    borderColor: Colors.accentDeep,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  plateText: { ...Typography.tag, color: Colors.accentBright, letterSpacing: 1 },
  odoHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.xl,
  },
  odoRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  odoValue: { ...Typography.statLarge, color: Colors.textPrimary, fontSize: 40, lineHeight: 42 },
  odoUnit: { ...Typography.caption, fontFamily: Typography.eyebrow.fontFamily, color: Colors.textSecondary },
  odoEditButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
  },
  odoLabel: { ...Typography.tag, color: Colors.textTertiary, marginTop: 4 },
  consumptionInline: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  consumptionValue: { ...Typography.statLarge, fontSize: 28, lineHeight: 32, color: Colors.textPrimary },
  consumptionUnit: { ...Typography.caption, fontFamily: Typography.eyebrow.fontFamily, color: Colors.textSecondary },
  consumptionEditButton: { padding: 6, marginLeft: 2 },
  consumptionLabel: { ...Typography.tag, color: Colors.textTertiary, marginTop: 4 },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },
  switcherButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  switcherText: { ...Typography.tag, color: Colors.accent },
  detailsHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailsHintText: { ...Typography.tag, color: Colors.textTertiary },
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
