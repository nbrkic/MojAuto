import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Vehicle = {
  id: number;
  make: string;
  model: string;
};

export default function AddExpenseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    db.getAllAsync<Vehicle>(
      "SELECT id, make, model FROM vehicles ORDER BY id DESC",
    ).then((rows) => {
      setVehicles(rows);
      if (rows.length > 0) setVehicleId(rows[0].id);
    });
  }, [db]);

  const canSave =
    vehicleId !== null && category.trim() !== "" && amount.trim() !== "";

  async function handleSave() {
    const today = new Date().toISOString().slice(0, 10);
    await db.runAsync(
      "INSERT INTO expenses (vehicle_id, category, amount, date) VALUES (?, ?, ?, ?)",
      vehicleId,
      category.trim(),
      Number(amount),
      today,
    );
    router.back();
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Prvo dodaj vozilo</Text>
        <Text style={styles.subtitle}>
          Trošak mora biti vezan za neko vozilo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dodaj trošak</Text>

      <Text style={styles.label}>Vozilo</Text>
      <Picker
        selectedValue={vehicleId}
        onValueChange={(value) => setVehicleId(value)}
      >
        {vehicles.map((v) => (
          <Picker.Item key={v.id} label={`${v.make} ${v.model}`} value={v.id} />
        ))}
      </Picker>

      <TextInput
        style={styles.input}
        placeholder="Kategorija (npr. Gorivo, Servis, Registracija)"
        value={category}
        onChangeText={setCategory}
      />
      <TextInput
        style={styles.input}
        placeholder="Iznos (RSD)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
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
  subtitle: { fontSize: 16, color: "#666" },
  label: { fontSize: 14, color: "#666", marginTop: 4 },
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
