import { cancelReminderNotification } from "@/notifications/reminders";
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

type ReminderRow = {
  id: number;
  title: string;
  due_date: string;
  vehicle_name: string;
  notification_id: string | null;
};

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderRow[]>([]);

  const load = useCallback(() => {
    db.getAllAsync<ReminderRow>(
      `SELECT reminders.id, reminders.title, reminders.due_date, reminders.notification_id,
              vehicles.make || ' ' || vehicles.model AS vehicle_name
       FROM reminders
       JOIN vehicles ON vehicles.id = reminders.vehicle_id
       WHERE reminders.is_done = 0
       ORDER BY reminders.due_date ASC`,
    ).then(setReminders);
  }, [db]);

  useFocusEffect(load);

  const today = new Date().toISOString().slice(0, 10);

  async function markDone(id: number, notificationId: string | null) {
    if (notificationId) {
      await cancelReminderNotification(notificationId);
    }
    await db.runAsync("UPDATE reminders SET is_done = 1 WHERE id = ?", id);
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
          await db.runAsync("DELETE FROM reminders WHERE id = ?", id);
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
                  <Text style={styles.meta}>{item.vehicle_name}</Text>
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
