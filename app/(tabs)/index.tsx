import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

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

  useFocusEffect(
    useCallback(() => {
      db.getAllAsync<Vehicle>("SELECT * FROM vehicles ORDER BY id DESC").then(
        setVehicles,
      );
    }, [db]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MojAuto</Text>

      <Pressable style={styles.addButton} onPress={() => router.push("/modal")}>
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
              <Text style={styles.vehicleName}>
                {item.make} {item.model}
              </Text>
              <Text style={styles.vehicleYear}>{item.year}</Text>
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
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  list: {
    width: "100%",
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "600",
  },
  vehicleYear: {
    fontSize: 16,
    color: "#666",
  },
});
