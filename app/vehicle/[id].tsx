import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CutCornerCard } from "@/components/ui/cut-corner-card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { formatEUR, formatNumberSr } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  mileage: number;
  fuel_type: string | null;
  power_kw: number | null;
  transmission: string | null;
  drivetrain: string | null;
  photo_url: string | null;
  vin: string | null;
  engine_displacement_cc: number | null;
  cylinder_count: number | null;
  valve_count: number | null;
  has_turbo: boolean | null;
  gear_count: number | null;
  tank_capacity_l: number | null;
  purchase_price_eur: number | null;
  tire_size: string | null;
  tire_brand: string | null;
  rim_size: string | null;
  rim_material: string | null;
};

export default function VehicleDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const loadedVehicleIdRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (loadedVehicleIdRef.current !== vehicleId) setLoading(true);
      supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .single()
        .then(({ data, error }) => {
          if (!active) return;
          if (error || !data) {
            showToast("Vozilo nije pronađeno", "error");
            router.back();
            return;
          }
          loadedVehicleIdRef.current = vehicleId;
          setVehicle(data);
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

  const specs = vehicle
    ? [
        { label: "Gorivo", value: vehicle.fuel_type },
        { label: "Snaga", value: vehicle.power_kw ? `${vehicle.power_kw} kW` : null },
        { label: "Menjač", value: vehicle.transmission },
        { label: "Pogon", value: vehicle.drivetrain },
        { label: "Zapremina motora", value: vehicle.engine_displacement_cc ? `${vehicle.engine_displacement_cc} cm³` : null },
        { label: "Broj cilindara", value: vehicle.cylinder_count ? String(vehicle.cylinder_count) : null },
        { label: "Broj ventila", value: vehicle.valve_count ? String(vehicle.valve_count) : null },
        { label: "Turbo", value: vehicle.has_turbo === null ? null : vehicle.has_turbo ? "Da" : "Ne" },
        { label: "Broj brzina", value: vehicle.gear_count ? String(vehicle.gear_count) : null },
        { label: "Kapacitet rezervoara", value: vehicle.tank_capacity_l ? `${vehicle.tank_capacity_l} l` : null },
        { label: "Dimenzija guma", value: vehicle.tire_size },
        { label: "Proizvođač guma", value: vehicle.tire_brand },
        { label: "Dimenzija felni", value: vehicle.rim_size },
        { label: "Materijal felni", value: vehicle.rim_material },
        { label: "VIN / broj šasije", value: vehicle.vin },
        { label: "Kupovna cena", value: vehicle.purchase_price_eur ? formatEUR(vehicle.purchase_price_eur) : null },
      ].filter((s): s is { label: string; value: string } => !!s.value)
    : [];

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
          {vehicle.photo_url && (
            <View style={styles.section}>
              <Image source={{ uri: vehicle.photo_url }} style={styles.photo} contentFit="cover" />
            </View>
          )}

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

          {specs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifikacije</Text>
              <Card padded={false}>
                {specs.map((spec, index) => (
                  <View
                    key={spec.label}
                    style={[styles.specRow, index < specs.length - 1 && styles.specRowDivider]}
                  >
                    <Text style={styles.specLabel}>{spec.label}</Text>
                    <Text style={styles.specValue}>{spec.value}</Text>
                  </View>
                ))}
              </Card>
            </View>
          )}

          <View style={styles.section}>
            <Card
              onPress={() => router.push({ pathname: "/vehicle-specs", params: { id: String(vehicleId) } })}
              style={styles.linkCard}
            >
              <Icon name="tune" size={18} color={Colors.accent} />
              <Text style={styles.linkText}>
                {specs.length > 0 ? "Uredi detaljne specifikacije" : "Dodaj detaljne specifikacije"}
              </Text>
              <Icon name="chevron-right" size={20} color={Colors.textTertiary} />
            </Card>
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
  photo: {
    width: "100%",
    height: 200,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  specRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  specLabel: { ...Typography.body, color: Colors.textSecondary },
  specValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  linkCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  linkText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
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
});
