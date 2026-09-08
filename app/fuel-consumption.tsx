import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { computeFuelStats, type FuelEntry } from "@/lib/fuel-stats";
import { formatDateNumericSr, formatDateShortSr, formatKm, formatNumberSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FuelConsumptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [loading, setLoading] = useState(true);
  const [vehicleName, setVehicleName] = useState("");
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [tankCapacityL, setTankCapacityL] = useState<number | null>(null);
  const loadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!loadedRef.current) setLoading(true);
      Promise.all([
        supabase.from("vehicles").select("make, model, tank_capacity_l").eq("id", vehicleId).single(),
        supabase
          .from("expenses")
          .select("id, date, amount, liters, mileage_at_fillup, is_full_tank")
          .eq("vehicle_id", vehicleId)
          .eq("category", "Gorivo")
          .not("mileage_at_fillup", "is", null)
          .not("liters", "is", null),
      ]).then(([vehicleRes, expenseRes]) => {
        if (!active) return;
        loadedRef.current = true;
        if (vehicleRes.data) {
          setVehicleName(`${vehicleRes.data.make} ${vehicleRes.data.model}`);
          setTankCapacityL(vehicleRes.data.tank_capacity_l);
        }
        setEntries((expenseRes.data as FuelEntry[]) ?? []);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [vehicleId]),
  );

  const stats = computeFuelStats(entries, tankCapacityL);
  const hasIntervals = stats.intervals.length > 0;

  const trendData = useMemo(
    () =>
      [...stats.intervals]
        .reverse()
        .map((iv, index) => ({
          key: `${iv.toDate}-${index}`,
          label: formatDateShortSr(iv.toDate),
          value: Math.round(iv.l100km * 10) / 10,
        })),
    [stats.intervals],
  );

  const topReadouts: ReadoutItem[] = [
    {
      key: "l100km",
      label: "Prosečna potrošnja",
      value: stats.avgL100km !== null ? `${stats.avgL100km.toFixed(1)} L` : "—",
      tone: "accent",
    },
    {
      key: "rsdkm",
      label: "RSD / km",
      value: stats.avgRsdPerKm !== null ? `${stats.avgRsdPerKm.toFixed(1)} RSD` : "—",
    },
    {
      key: "price",
      label: "Prosečna cena goriva",
      value: stats.avgPricePerLiter !== null ? `${stats.avgPricePerLiter.toFixed(2)} RSD/L` : "—",
    },
  ];

  const bottomReadouts: ReadoutItem[] = [
    {
      key: "monthLiters",
      label: "Potrošnja ovog meseca",
      value: `${formatNumberSr(stats.currentMonthLiters)} L`,
    },
    {
      key: "monthCost",
      label: "Trošak goriva ovog meseca",
      value: formatRSD(stats.currentMonthCost),
    },
    {
      key: "range",
      label: "Domet sa punim rezervoarom",
      value: stats.rangeOnFullTankKm !== null ? formatKm(Math.round(stats.rangeOnFullTankKm)) : "—",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxxl }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
          <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Potrošnja goriva</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.section}>
          <Skeleton height={200} radius={0} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.section}>
          <EmptyState
            icon="gas-station"
            title="Još nema podataka o sipanju"
            subtitle={`Dodaj trošak goriva za ${vehicleName || "ovo vozilo"} sa kilometražom da bi videli statistiku.`}
          />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <ReadoutStrip items={topReadouts} />
          </View>
          <View style={styles.section}>
            <ReadoutStrip items={bottomReadouts} />
          </View>

          {!hasIntervals && (
            <View style={styles.section}>
              <Card>
                <Text style={styles.hintText}>
                  Za tačan obračun potrošnje (L/100km) potrebna su bar dva sipanja do punog rezervoara. Do tada se
                  prikazuju samo cena goriva i mesečni troškovi.
                </Text>
              </Card>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Potrošnja poslednjih 6 meseci</Text>
            <Card>
              <BarChart data={stats.monthlyL100km} />
              <Text style={styles.chartUnit}>L/100km</Text>
            </Card>
          </View>

          {hasIntervals && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trend potrošnje po sipanjima</Text>
              <Card>
                <LineChart data={trendData} />
                <Text style={styles.chartUnit}>L/100km</Text>
              </Card>
            </View>
          )}

          {hasIntervals && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Potrošnja po putovanju</Text>
              <View style={{ gap: Spacing.sm }}>
                {stats.intervals.map((iv, index) => (
                  <Card key={`${iv.fromDate}-${iv.toDate}-${index}`} style={styles.tripRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.tripDate}>
                        {formatDateNumericSr(iv.fromDate)} — {formatDateNumericSr(iv.toDate)}
                      </Text>
                      <Text style={styles.tripMeta}>
                        {formatKm(iv.distanceKm)} · {iv.liters.toFixed(1)} L · {formatRSD(iv.cost)}
                      </Text>
                    </View>
                    <Text style={styles.tripValue}>{iv.l100km.toFixed(1)} L</Text>
                  </Card>
                ))}
              </View>
            </View>
          )}
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
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  hintText: { ...Typography.caption, color: Colors.textSecondary },
  chartUnit: { ...Typography.tag, color: Colors.textTertiary, marginTop: Spacing.md, textAlign: "center" },
  tripRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  tripDate: { ...Typography.bodyMedium, color: Colors.textPrimary },
  tripMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  tripValue: { ...Typography.statMedium, color: Colors.accentBright },
});
