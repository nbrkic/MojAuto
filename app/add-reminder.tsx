import { scheduleReminderNotification } from "@/notifications/reminders";
import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Vehicle = {
  id: number;
  make: string;
  model: string;
};

export default function AddReminderScreen() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("id, make, model")
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          Alert.alert("Greška", error.message);
          return;
        }
        setVehicles(data ?? []);
        if (data && data.length > 0) setVehicleId(data[0].id);
      });
  }, []);

  const canSave =
    vehicleId !== null &&
    title.trim() !== "" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim());

  async function handleSave() {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const notificationId = await scheduleReminderNotification(
      title.trim(),
      vehicle ? `${vehicle.make} ${vehicle.model}` : "",
      dueDate.trim(),
    );

    const { error } = await supabase.from("reminders").insert({
      vehicle_id: vehicleId,
      title: title.trim(),
      due_date: dueDate.trim(),
      notification_id: notificationId,
    });

    if (error) {
      Alert.alert("Greška", error.message);
      return;
    }
    router.back();
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Prvo dodaj vozilo</Text>
        <Text style={styles.subtitle}>
          Podsetnik mora biti vezan za neko vozilo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dodaj podsetnik</Text>

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
        placeholder="Šta treba uraditi (npr. Zamena ulja)"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Datum (GGGG-MM-DD, npr. 2026-10-15)"
        value={dueDate}
        onChangeText={setDueDate}
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
