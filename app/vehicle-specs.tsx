import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { RIM_MATERIALS, YES_NO_OPTIONS } from "@/constants/vehicle-options";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VehicleSpecsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vin, setVin] = useState("");
  const [displacement, setDisplacement] = useState("");
  const [cylinders, setCylinders] = useState("");
  const [valves, setValves] = useState("");
  const [turbo, setTurbo] = useState<string | null>(null);
  const [gears, setGears] = useState("");
  const [tankCapacity, setTankCapacity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [tireSize, setTireSize] = useState("");
  const [tireBrand, setTireBrand] = useState("");
  const [rimSize, setRimSize] = useState("");
  const [rimMaterial, setRimMaterial] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select(
        "vin, engine_displacement_cc, cylinder_count, valve_count, has_turbo, gear_count, tank_capacity_l, purchase_price_eur, tire_size, tire_brand, rim_size, rim_material",
      )
      .eq("id", vehicleId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoading(false);
          return;
        }
        setVin(data.vin ?? "");
        setDisplacement(data.engine_displacement_cc ? String(data.engine_displacement_cc) : "");
        setCylinders(data.cylinder_count ? String(data.cylinder_count) : "");
        setValves(data.valve_count ? String(data.valve_count) : "");
        setTurbo(data.has_turbo === null ? null : data.has_turbo ? "Da" : "Ne");
        setGears(data.gear_count ? String(data.gear_count) : "");
        setTankCapacity(data.tank_capacity_l ? String(data.tank_capacity_l) : "");
        setPurchasePrice(data.purchase_price_eur ? String(data.purchase_price_eur) : "");
        setTireSize(data.tire_size ?? "");
        setTireBrand(data.tire_brand ?? "");
        setRimSize(data.rim_size ?? "");
        setRimMaterial(data.rim_material);
        setLoading(false);
      });
  }, [vehicleId]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      vin: vin.trim() || null,
      engine_displacement_cc: displacement.trim() ? Number(displacement) : null,
      cylinder_count: cylinders.trim() ? Number(cylinders) : null,
      valve_count: valves.trim() ? Number(valves) : null,
      has_turbo: turbo === null ? null : turbo === "Da",
      gear_count: gears.trim() ? Number(gears) : null,
      tank_capacity_l: tankCapacity.trim() ? Number(tankCapacity) : null,
      purchase_price_eur: purchasePrice.trim() ? Number(purchasePrice) : null,
      tire_size: tireSize.trim() || null,
      tire_brand: tireBrand.trim() || null,
      rim_size: rimSize.trim() || null,
      rim_material: rimMaterial,
    };

    const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicleId);

    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Specifikacije sačuvane");
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Detaljne specifikacije</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.form}>
            <Skeleton height={300} radius={0} />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Motor</Text>
            <TextField
              label="Zapremina motora u cm³ (opciono)"
              placeholder="npr. 1368"
              value={displacement}
              onChangeText={setDisplacement}
              keyboardType="number-pad"
            />
            <TextField
              label="Broj cilindara (opciono)"
              placeholder="npr. 4"
              value={cylinders}
              onChangeText={setCylinders}
              keyboardType="number-pad"
            />
            <TextField
              label="Broj ventila (opciono)"
              placeholder="npr. 16"
              value={valves}
              onChangeText={setValves}
              keyboardType="number-pad"
            />
            <SelectField
              label="Turbo (opciono)"
              placeholder="Izaberi"
              value={turbo}
              onChange={setTurbo}
              options={YES_NO_OPTIONS}
            />
            <TextField
              label="Broj brzina (opciono)"
              placeholder="npr. 6"
              value={gears}
              onChangeText={setGears}
              keyboardType="number-pad"
            />
            <TextField
              label="Kapacitet rezervoara u litrima (opciono)"
              placeholder="npr. 50"
              value={tankCapacity}
              onChangeText={setTankCapacity}
              keyboardType="decimal-pad"
            />

            <Text style={styles.sectionTitle}>Gume i felne</Text>
            <TextField
              label="Dimenzija guma (opciono)"
              placeholder="npr. 205/55 R16"
              value={tireSize}
              onChangeText={setTireSize}
              autoCapitalize="characters"
            />
            <TextField
              label="Proizvođač guma (opciono)"
              placeholder="npr. Michelin"
              value={tireBrand}
              onChangeText={setTireBrand}
              autoCapitalize="words"
            />
            <TextField
              label="Dimenzija felni (opciono)"
              placeholder="npr. 16″"
              value={rimSize}
              onChangeText={setRimSize}
              autoCapitalize="characters"
            />
            <SelectField
              label="Materijal felni (opciono)"
              placeholder="Izaberi materijal"
              value={rimMaterial}
              onChange={setRimMaterial}
              options={RIM_MATERIALS}
            />

            <Text style={styles.sectionTitle}>Ostalo</Text>
            <TextField
              label="VIN / broj šasije (opciono)"
              placeholder="17 karaktera"
              value={vin}
              onChangeText={setVin}
              autoCapitalize="characters"
            />
            <TextField
              label="Kupovna cena u EUR (opciono)"
              placeholder="npr. 8500"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="number-pad"
            />

            <Button title="Sačuvaj" onPress={handleSave} loading={saving} />
          </View>
        )}
      </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: { ...Typography.h2, color: Colors.textPrimary, flexShrink: 1 },
  form: { paddingHorizontal: Spacing.xl },
  sectionTitle: { ...Typography.eyebrow, color: Colors.accent, marginBottom: Spacing.md, marginTop: Spacing.sm },
});
