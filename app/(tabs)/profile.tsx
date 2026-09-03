import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { formatKm, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  mileage: number;
};

type VehicleStats = { total: number; count: number };

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const showToast = useToast();
  const firstName = session?.user?.user_metadata?.first_name as string | undefined;
  const lastName = session?.user?.user_metadata?.last_name as string | undefined;
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statsByVehicle, setStatsByVehicle] = useState<Record<number, VehicleStats>>({});
  const hasLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!hasLoadedRef.current) setLoading(true);
      Promise.all([
        supabase.from("vehicles").select("id, make, model, year, mileage").order("id", { ascending: false }),
        supabase.from("expenses").select("vehicle_id, amount"),
      ]).then(([vehicleRes, expenseRes]) => {
        if (!active) return;
        hasLoadedRef.current = true;
        setVehicles(vehicleRes.data ?? []);
        const stats: Record<number, VehicleStats> = {};
        for (const e of expenseRes.data ?? []) {
          const entry = stats[e.vehicle_id] ?? { total: 0, count: 0 };
          entry.total += e.amount;
          entry.count += 1;
          stats[e.vehicle_id] = entry;
        }
        setStatsByVehicle(stats);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  function deleteVehicle(id: number) {
    Alert.alert(
      "Obriši vozilo?",
      "Ovo će obrisati i sve njegove troškove i podsetnike.",
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("vehicles").delete().eq("id", id);
            if (error) {
              showToast(error.message, "error");
              return;
            }
            showToast("Vozilo obrisano");
            setVehicles((prev) => prev.filter((v) => v.id !== id));
          },
        },
      ],
    );
  }

  function handleLogout() {
    supabase.auth.signOut();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: Spacing.xxxl }}
    >
      <View style={styles.section}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <Card style={[styles.section, { borderLeftWidth: 2, borderLeftColor: Colors.accent }]}>
        <View style={styles.accountRow}>
          <View style={styles.avatar}>
            <Icon name="account" size={22} color={Colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            {fullName ? (
              <>
                <Text style={styles.accountName} numberOfLines={1}>{fullName}</Text>
                <Text style={styles.accountEmail} numberOfLines={1}>{session?.user?.email}</Text>
              </>
            ) : (
              <>
                <Text style={styles.accountLabel}>Prijavljen kao</Text>
                <Text style={styles.accountValue} numberOfLines={1}>{session?.user?.email}</Text>
              </>
            )}
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moja vozila</Text>
      </View>

      {loading ? (
        <View style={styles.section}>
          <Skeleton height={90} radius={0} />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.section}>
          <EmptyState
            icon="car-side"
            title="Nema dodatih vozila"
            actionLabel="+ Dodaj vozilo"
            onAction={() => router.push("/add-vehicle")}
          />
        </View>
      ) : (
        <View style={[styles.section, { gap: Spacing.sm }]}>
          {vehicles.map((v) => {
            const stats = statsByVehicle[v.id] ?? { total: 0, count: 0 };
            return (
              <Card key={v.id} onPress={() => router.push(`/vehicle/${v.id}`)}>
                <View style={styles.vehicleRow}>
                  <Icon name="car-side" size={18} color={Colors.accent} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.vehicleName} numberOfLines={1}>{v.make} {v.model}</Text>
                    <Text style={styles.vehicleMeta} numberOfLines={1}>
                      {v.year} · {formatKm(v.mileage)}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
                  <Pressable onPress={() => deleteVehicle(v.id)} hitSlop={8} style={styles.deleteButton}>
                    <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                  </Pressable>
                </View>
                <View style={styles.vehicleStatsRow}>
                  <Text style={styles.vehicleStatText}>{formatRSD(stats.total)} ukupno</Text>
                  <Text style={styles.vehicleStatText}>{stats.count} {stats.count === 1 ? "trošak" : "troškova"}</Text>
                </View>
              </Card>
            );
          })}
          <Pressable onPress={() => router.push("/add-vehicle")} style={styles.addVehicleRow}>
            <Icon name="plus" size={17} color={Colors.accent} />
            <Text style={styles.addVehicleText}>Dodaj vozilo</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Card onPress={handleLogout} style={[styles.linkCard, { borderLeftWidth: 2, borderLeftColor: Colors.danger }]}>
          <Icon name="logout" size={18} color={Colors.danger} />
          <Text style={[styles.linkText, { color: Colors.danger }]}>Odjavi se</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.textPrimary },
  accountRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  accountLabel: { ...Typography.eyebrow, color: Colors.textTertiary },
  accountName: { ...Typography.h3, color: Colors.textPrimary },
  accountValue: { ...Typography.bodyMedium, color: Colors.textPrimary, marginTop: 4 },
  accountEmail: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  sectionHeader: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  vehicleName: { ...Typography.bodyMedium, color: Colors.textPrimary },
  vehicleMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  deleteButton: { padding: 4 },
  vehicleStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  vehicleStatText: { ...Typography.caption, color: Colors.textSecondary },
  addVehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  addVehicleText: { ...Typography.tag, color: Colors.accent },
  linkCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  linkText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
});
