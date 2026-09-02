import { cancelReminderNotification } from "@/notifications/reminders";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type ReminderRow = {
  id: number;
  title: string;
  due_date: string;
  notification_id: string | null;
  vehicles: { make: string; model: string } | null;
};

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderRow[]>([]);

  const load = useCallback(() => {
    supabase
      .from("reminders")
      .select("id, title, due_date, notification_id, vehicles(make, model)")
      .eq("is_done", false)
      .order("due_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          Alert.alert("Greška", error.message);
          return;
        }
        setReminders((data ?? []) as unknown as ReminderRow[]);
      });
  }, []);

  useFocusEffect(load);

  const today = new Date().toISOString().slice(0, 10);

  async function markDone(id: number, notificationId: string | null) {
    if (notificationId) {
      await cancelReminderNotification(notificationId);
    }
    const { error } = await supabase
      .from("reminders")
      .update({ is_done: true })
      .eq("id", id);
    if (error) {
      Alert.alert("Greška", error.message);
      return;
    }
    load();
  }

  function deleteReminder(id: number, notificationId: string | null) {
    Alert.alert("Obriši podsetnik?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          if (notificationId) {
            await cancelReminderNotification(notificationId);
          }
          const { error } = await supabase
            .from("reminders")
            .delete()
            .eq("id", id);
          if (error) {
            Alert.alert("Greška", error.message);
            return;
          }
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Servisi</Text>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/add-reminder")}
      >
        <Text style={styles.addButtonText}>+ Dodaj podsetnik</Text>
      </Pressable>

      {reminders.length === 0 ? (
        <Text style={styles.subtitle}>Nemaš aktivnih podsetnika</Text>
      ) : (
        <FlatList
          style={styles.list}
          data={reminders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const overdue = item.due_date < today;
            return (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowInfo}
                  onPress={() => markDone(item.id, item.notification_id)}
                >
                  <Text style={styles.reminderTitle}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {item.vehicles
                      ? `${item.vehicles.make} ${item.vehicles.model}`
                      : ""}
                  </Text>
                </Pressable>
                <Text style={[styles.date, overdue && styles.overdue]}>
                  {overdue ? "Isteklo" : item.due_date}
                </Text>
                <Pressable
                  onPress={() => deleteReminder(item.id, item.notification_id)}
                >
                  <Text style={styles.deleteText}>Obriši</Text>
                </Pressable>
              </View>
            );
          }}
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
  rowInfo: { flex: 1 },
  reminderTitle: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, color: "#666", marginTop: 2 },
  date: { fontSize: 14, color: "#666", marginRight: 12 },
  overdue: { color: "#D64545", fontWeight: "700" },
  deleteText: { color: "#D64545", fontSize: 14, fontWeight: "600" },
});
