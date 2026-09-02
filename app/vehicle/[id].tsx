import { supabase } from "@/lib/supabase";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AddVehicleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");

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

  const canSave =
    make.trim() !== "" && model.trim() !== "" && year.trim() !== "";

  async function handleSave() {
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

    if (error) {
      Alert.alert("Greška", error.message);
      return;
    }
    router.back();
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: editingId !== null ? "Izmeni vozilo" : "Dodaj vozilo",
        }}
      />
      <Text style={styles.title}>
        {editingId !== null ? "Izmeni vozilo" : "Dodaj vozilo"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Marka (npr. Volkswagen)"
        value={make}
        onChangeText={setMake}
      />
      <TextInput
        style={styles.input}
        placeholder="Model (npr. Golf)"
        value={model}
        onChangeText={setModel}
      />
      <TextInput
        style={styles.input}
        placeholder="Godište"
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Registracija (opciono)"
        value={licensePlate}
        onChangeText={setLicensePlate}
      />
      <TextInput
        style={styles.input}
        placeholder="Kilometraža (opciono)"
        value={mileage}
        onChangeText={setMileage}
        keyboardType="number-pad"
      />

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        disabled={!canSave}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Sačuvaj</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
