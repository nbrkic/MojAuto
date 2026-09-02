import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId === null) return;
    supabase
      .from("vehicles")
      .select("make, model, year, license_plate, mileage")
      .eq("id", editingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        setMake(data.make);
        setModel(data.model);
        setYear(String(data.year));
        setLicensePlate(data.license_plate ?? "");
        setMileage(String(data.mileage));
      });
  }, [editingId]);

  const canSave = make.trim() !== "" && model.trim() !== "" && year.trim() !== "";

  async function handleSave() {
    setSaving(true);
    const payload = {
      make: make.trim(),
      model: model.trim(),
      year: Number(year),
      license_plate: licensePlate.trim() || null,
      mileage: Number(mileage) || 0,
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <TextField
            label="Marka"
            placeholder="npr. Volkswagen"
            value={make}
            onChangeText={setMake}
          />
          <TextField
            label="Model"
            placeholder="npr. Golf"
            value={model}
            onChangeText={setModel}
          />
          <TextField
            label="Godište"
            placeholder="npr. 2018"
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
          />
          <TextField
            label="Registracija (opciono)"
            placeholder="npr. BG-123-AB"
            value={licensePlate}
            onChangeText={setLicensePlate}
            autoCapitalize="characters"
          />
          <TextField
            label="Kilometraža (opciono)"
            placeholder="npr. 142350"
            value={mileage}
            onChangeText={setMileage}
            keyboardType="number-pad"
          />

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
