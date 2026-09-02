import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { DRIVETRAINS, FUEL_TYPES, TRANSMISSIONS } from "@/constants/vehicle-options";
import { useAuth } from "@/lib/auth-context";
import { capitalizeFirst } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { uploadVehiclePhoto } from "@/lib/vehicle-photos";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddVehicleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [make, setMake] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState<string | null>(null);
  const [power, setPower] = useState("");
  const [transmission, setTransmission] = useState<string | null>(null);
  const [drivetrain, setDrivetrain] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [makes, setMakes] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("car_makes")
      .select("id, name")
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          showToast(error.message, "error");
          return;
        }
        setMakes(data ?? []);
      });
  }, [showToast]);

  useEffect(() => {
    if (editingId === null) return;
    supabase
      .from("vehicles")
      .select("make, model, year, license_plate, mileage, fuel_type, power_kw, transmission, drivetrain, photo_url")
      .eq("id", editingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        setMake(data.make);
        setModel(data.model);
        setYear(String(data.year));
        setLicensePlate(data.license_plate ?? "");
        setMileage(String(data.mileage));
        setFuelType(data.fuel_type);
        setPower(data.power_kw ? String(data.power_kw) : "");
        setTransmission(data.transmission);
        setDrivetrain(data.drivetrain);
        setPhotoUri(data.photo_url);
      });
  }, [editingId]);

  const canSave = !!make?.trim() && model.trim() !== "" && year.trim() !== "";

  async function handleSave() {
    setSaving(true);

    let photoUrl = photoUri;
    if (photoUri && !photoUri.startsWith("http") && session?.user?.id) {
      try {
        photoUrl = await uploadVehiclePhoto(photoUri, session.user.id);
      } catch (error) {
        setSaving(false);
        showToast(error instanceof Error ? error.message : "Fotografija nije uspela da se otpremi", "error");
        return;
      }
    }

    const payload = {
      make: (make ?? "").trim(),
      model: capitalizeFirst(model.trim()),
      year: Number(year),
      license_plate: licensePlate.trim() || null,
      mileage: Number(mileage) || 0,
      fuel_type: fuelType,
      power_kw: power.trim() ? Number(power) : null,
      transmission,
      drivetrain,
      photo_url: photoUrl,
    };

    const { error } =
      editingId !== null
        ? await supabase.from("vehicles").update(payload).eq("id", editingId)
        : await supabase.from("vehicles").insert(payload);

    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast(editingId !== null ? "Vozilo izmenjeno" : "Vozilo dodato");
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{editingId !== null ? "Izmeni vozilo" : "Dodaj vozilo"}</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.form}>
          <SelectField
            label="Marka"
            placeholder="Izaberi marku"
            sheetTitle="Marka vozila"
            value={make}
            onChange={setMake}
            options={makes.map((m) => ({ value: m.name, label: m.name }))}
            searchable
            searchPlaceholder="Pretraži marke..."
          />
          <TextField
            label="Model"
            placeholder="npr. Golf"
            value={model}
            onChangeText={setModel}
            onBlur={() => setModel((m) => capitalizeFirst(m))}
            autoCapitalize="words"
          />
          <TextField
            label="Godište"
            placeholder="npr. 2018"
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
          />
          <TextField
            label="Registarska oznaka (opciono)"
            placeholder="npr. BG-123-AB"
            value={licensePlate}
            onChangeText={setLicensePlate}
            autoCapitalize="characters"
          />
          <TextField
            label="Trenutna kilometraža (opciono)"
            placeholder="npr. 142350"
            value={mileage}
            onChangeText={setMileage}
            keyboardType="number-pad"
          />
          <SelectField
            label="Gorivo (opciono)"
            placeholder="Izaberi gorivo"
            value={fuelType}
            onChange={setFuelType}
            options={FUEL_TYPES}
          />
          <TextField
            label="Snaga u kW (opciono)"
            placeholder="npr. 90"
            value={power}
            onChangeText={setPower}
            keyboardType="number-pad"
          />
          <SelectField
            label="Menjač (opciono)"
            placeholder="Izaberi menjač"
            value={transmission}
            onChange={setTransmission}
            options={TRANSMISSIONS}
          />
          <SelectField
            label="Pogon (opciono)"
            placeholder="Izaberi pogon"
            value={drivetrain}
            onChange={setDrivetrain}
            options={DRIVETRAINS}
          />
          <PhotoPicker label="Fotografija (opciono)" value={photoUri} onChange={setPhotoUri} />

          <Button title="Sačuvaj" onPress={handleSave} disabled={!canSave} loading={saving} />
        </View>
      </ScrollView>
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
  title: { ...Typography.h2, color: Colors.textPrimary },
  form: { paddingHorizontal: Spacing.xl },
});
