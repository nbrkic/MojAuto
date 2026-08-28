import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string | null;
  mileage: number;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const load = useCallback(() => {
    db.getAllAsync<Vehicle>("SELECT * FROM vehicles ORDER BY id DESC").then(
      setVehicles,
    );
  }, [db]);

  useFocusEffect(load);

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
            await db.runAsync("DELETE FROM expenses WHERE vehicle_id = ?", id);
            await db.runAsync("DELETE FROM reminders WHERE vehicle_id = ?", id);
            await db.runAsync("DELETE FROM vehicles WHERE id = ?", id);
            load();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MojAuto</Text>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/add-vehicle")}
      >
        <Text style={styles.addButtonText}>+ Dodaj vozilo</Text>
      </Pressable>

      {vehicles.length === 0 ? (
        <Text style={styles.subtitle}>Još nemaš dodato nijedno vozilo</Text>
      ) : (
        <FlatList
          style={styles.list}
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.vehicleRow}>
              <Pressable
                style={styles.vehicleInfo}
                onPress={() => router.push(`/vehicle/${item.id}`)}
              >
                <Text style={styles.vehicleName}>
                  {item.make} {item.model}
                </Text>
                <Text style={styles.vehicleYear}>{item.year}</Text>
              </Pressable>
              <Pressable onPress={() => deleteVehicle(item.id)}>
                <Text style={styles.deleteText}>Obriši</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 16 },
  addButton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 16, color: "#666" },
  list: { width: "100%" },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 18, fontWeight: "600" },
  vehicleYear: { fontSize: 16, color: "#666" },
  deleteText: {
    color: "#D64545",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 12,
  },
});
