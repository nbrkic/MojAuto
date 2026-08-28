import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function AddVehicleScreen() {
  const db = useSQLiteContext();
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
    db.getFirstAsync<{
      make: string;
      model: string;
      year: number;
      license_plate: string | null;
      mileage: number;
    }>(
      "SELECT make, model, year, license_plate, mileage FROM vehicles WHERE id = ?",
      editingId,
    ).then((row) => {
      if (!row) return;
      setMake(row.make);
      setModel(row.model);
      setYear(String(row.year));
      setLicensePlate(row.license_plate ?? "");
      setMileage(String(row.mileage));
    });
  }, [db, editingId]);

  const canSave =
    make.trim() !== "" && model.trim() !== "" && year.trim() !== "";

  async function handleSave() {
    if (editingId !== null) {
      await db.runAsync(
        "UPDATE vehicles SET make = ?, model = ?, year = ?, license_plate = ?, mileage = ? WHERE id = ?",
        make.trim(),
        model.trim(),
        Number(year),
        licensePlate.trim() || null,
        Number(mileage) || 0,
        editingId,
      );
    } else {
      await db.runAsync(
        "INSERT INTO vehicles (make, model, year, license_plate, mileage) VALUES (?, ?, ?, ?, ?)",
        make.trim(),
        model.trim(),
        Number(year),
        licensePlate.trim() || null,
        Number(mileage) || 0,
      );
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
