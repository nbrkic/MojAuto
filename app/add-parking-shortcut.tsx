import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
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

type Vehicle = { id: number; make: string; model: string; license_plate: string | null };

export default function AddParkingShortcutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zone, setZone] = useState("");
  const [limitHours, setLimitHours] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [saving, setSaving] = useState(false);

  const vehiclesWithPlate = vehicles.filter((v) => v.license_plate);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("id, make, model, license_plate")
      .eq("archived", false)
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          showToast(error.message, "error");
          setVehiclesLoaded(true);
          return;
        }
        const list = data ?? [];
        setVehicles(list);
        const withPlate = list.filter((v) => v.license_plate);
        if (withPlate.length > 0) setVehicleId(withPlate[0].id);
        setVehiclesLoaded(true);
      });
  }, [showToast]);

  const canSave =
    vehicleId !== null &&
    title.trim() !== "" &&
    phoneNumber.trim() !== "" &&
    zone.trim() !== "" &&
    limitHours.trim() !== "" &&
    Number(limitHours) > 0 &&
    pricePerHour.trim() !== "" &&
    Number(pricePerHour.replace(",", ".")) > 0;

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("parking_shortcuts").insert({
      vehicle_id: vehicleId,
      title: title.trim(),
      phone_number: phoneNumber.trim(),
      zone: zone.trim(),
      limit_hours: Number(limitHours),
      price_per_hour: Number(pricePerHour.replace(",", ".")),
    });
    setSaving(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Prečica sačuvana");
    router.back();
  }

  if (vehiclesLoaded && vehiclesWithPlate.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { marginTop: insets.top + Spacing.md }]}>
          <Text style={styles.title}>Nova prečica za parking</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <EmptyState
          icon="car-side"
          title="Nijedno vozilo nema registarsku tablicu"
          subtitle="Dodaj registarsku tablicu vozilu (u izmeni vozila) da bi mogao da napraviš prečicu za plaćanje parkinga."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Nova prečica za parking</Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Icon name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <SelectField
              label="Vozilo"
              placeholder="Izaberi vozilo"
              value={vehicleId}
              onChange={setVehicleId}
              options={vehiclesWithPlate.map((v) => ({
                value: v.id,
                label: `${v.make} ${v.model} · ${v.license_plate}`,
                icon: "car-side" as const,
              }))}
            />
            <TextField
              label="Naslov"
              placeholder="npr. Fiat Crvena zona"
              value={title}
              onChangeText={setTitle}
            />
            <TextField
              label="Broj za SMS plaćanje"
              placeholder="npr. 1919"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            <TextField
              label="Zona"
              placeholder="npr. Crvena zona"
              value={zone}
              onChangeText={setZone}
            />
            <TextField
              label="Limit parkinga (h)"
              placeholder="npr. 2"
              value={limitHours}
              onChangeText={setLimitHours}
              keyboardType="number-pad"
            />
            <TextField
              label="Cena po satu (RSD)"
              placeholder="npr. 90"
              value={pricePerHour}
              onChangeText={setPricePerHour}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>
              Jedna SMS poruka plaća 1h parkinga. Limit određuje koliko poruka najviše možeš poslati zaredom u ovoj
              zoni.
            </Text>

            <Button title="Sačuvaj" onPress={handleSave} disabled={!canSave} loading={saving} style={{ marginTop: Spacing.md }} />
          </View>
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
  title: { ...Typography.h2, color: Colors.textPrimary, flex: 1, marginRight: Spacing.md },
  form: { paddingHorizontal: Spacing.xl },
  hint: { ...Typography.caption, color: Colors.textSecondary, marginTop: -Spacing.sm, marginBottom: Spacing.md },
});
