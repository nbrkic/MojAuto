import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

type ExpenseRow = {
  id: number;
  category: string;
  amount: number;
  date: string;
  vehicle_name: string;
};

export default function ExpensesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      db.getAllAsync<ExpenseRow>(
        `SELECT expenses.id, expenses.category, expenses.amount, expenses.date,
                vehicles.make || ' ' || vehicles.model AS vehicle_name
         FROM expenses
         JOIN vehicles ON vehicles.id = expenses.vehicle_id
         ORDER BY expenses.date DESC, expenses.id DESC`,
      ).then(setExpenses);
    }, [db]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Troškovi</Text>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/add-expense")}
      >
        <Text style={styles.addButtonText}>+ Dodaj trošak</Text>
      </Pressable>

      {expenses.length === 0 ? (
        <Text style={styles.subtitle}>Još nemaš dodat nijedan trošak</Text>
      ) : (
        <FlatList
          style={styles.list}
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.meta}>
                  {item.vehicle_name} · {item.date}
                </Text>
              </View>
              <Text style={styles.amount}>{item.amount.toFixed(0)} RSD</Text>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  category: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, color: "#666", marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "600" },
});
