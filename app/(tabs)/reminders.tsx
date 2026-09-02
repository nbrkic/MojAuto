import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { daysUntil, formatDateNumericSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cancelReminderNotification } from "@/notifications/reminders";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReminderRow = {
  id: number;
  title: string;
  due_date: string;
  notification_id: string | null;
  vehicles: { make: string; model: string } | null;
};

type HistoryItem = {
  key: string;
  title: string;
  date: string;
  amount: number | null;
  vehicleLabel: string;
};

export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    Promise.all([
      supabase
        .from("reminders")
        .select("id, title, due_date, notification_id, vehicles(make, model)")
        .eq("is_done", false)
        .order("due_date", { ascending: true }),
      supabase
        .from("reminders")
        .select("id, title, due_date, vehicles(make, model)")
        .eq("is_done", true)
        .order("due_date", { ascending: false })
        .limit(10),
      supabase
        .from("expenses")
        .select("id, category, note, amount, date, vehicles(make, model)")
        .eq("category", "Servis")
        .order("date", { ascending: false })
        .limit(10),
    ]).then(([activeRes, doneRes, expenseRes]) => {
      hasLoadedRef.current = true;
      if (activeRes.error) {
        showToast(activeRes.error.message, "error");
        setLoading(false);
        return;
      }
      setReminders((activeRes.data ?? []) as unknown as ReminderRow[]);

      const doneItems: HistoryItem[] = ((doneRes.data ?? []) as any[]).map((r) => ({
        key: `reminder-${r.id}`,
        title: r.title,
        date: r.due_date,
        amount: null,
        vehicleLabel: r.vehicles ? `${r.vehicles.make} ${r.vehicles.model}` : "",
      }));
      const expenseItems: HistoryItem[] = ((expenseRes.data ?? []) as any[]).map((e) => ({
        key: `expense-${e.id}`,
        title: e.note?.trim() || "Servis",
        date: e.date,
        amount: e.amount,
        vehicleLabel: e.vehicles ? `${e.vehicles.make} ${e.vehicles.model}` : "",
      }));
      setHistory(
        [...doneItems, ...expenseItems].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12),
      );
      setLoading(false);
    });
  }, [showToast]);

  useFocusEffect(load);

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = reminders.filter((r) => r.due_date < today).length;

  const overviewItems: ReadoutItem[] = [
    { key: "active", label: "Aktivnih", value: String(reminders.length) },
    {
      key: "overdue",
      label: "Isteklo",
      value: String(overdueCount),
      tone: overdueCount > 0 ? "danger" : "success",
    },
  ];

  async function markDone(id: number, notificationId: string | null) {
    if (notificationId) await cancelReminderNotification(notificationId);
    const { error } = await supabase.from("reminders").update({ is_done: true }).eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Označeno kao završeno");
    load();
  }

  function deleteReminder(id: number, notificationId: string | null) {
    Alert.alert("Obriši podsetnik?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          if (notificationId) await cancelReminderNotification(notificationId);
          const { error } = await supabase.from("reminders").delete().eq("id", id);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          showToast("Podsetnik obrisan");
          load();
        },
      },
    ]);
  }

  const isEmpty = !loading && reminders.length === 0 && history.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }}
      >
        <View style={styles.section}>
          <Text style={styles.title}>Obaveze</Text>
        </View>

        {loading ? (
          <View style={styles.section}>
            <Skeleton height={100} radius={0} />
          </View>
        ) : isEmpty ? (
          <EmptyState
            icon="clipboard-check-outline"
            title="Nema obaveza"
            subtitle="Dodaj podsetnik da bi pratio predstojeće servise i registraciju."
            actionLabel="+ Dodaj podsetnik"
            onAction={() => router.push("/add-reminder")}
          />
        ) : (
          <>
            <View style={styles.section}>
              <ReadoutStrip items={overviewItems} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Predstoji</Text>
              {reminders.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>Nema aktivnih podsetnika.</Text>
                </Card>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  {reminders.map((r) => {
                    const days = daysUntil(r.due_date);
                    const overdue = days < 0;
                    const soon = days >= 0 && days <= 7;
                    const tone = overdue ? Colors.danger : soon ? Colors.warning : Colors.accent;
                    const statusText = overdue
                      ? "Isteklo"
                      : days === 0
                        ? "Danas"
                        : `Za ${days} ${days === 1 ? "dan" : "dana"}`;
                    return (
                      <Card key={r.id} style={[styles.reminderRow, { borderLeftWidth: 2, borderLeftColor: tone }]}>
                        <Pressable
                          onPress={() => markDone(r.id, r.notification_id)}
                          style={styles.checkMark}
                          hitSlop={8}
                        >
                          <Icon name="checkbox-blank-circle-outline" size={20} color={Colors.textTertiary} />
                        </Pressable>
                        <View style={styles.reminderInfo}>
                          <Text style={styles.reminderTitle} numberOfLines={1}>{r.title}</Text>
                          <Text style={styles.reminderMeta} numberOfLines={1}>
                            {r.vehicles ? `${r.vehicles.make} ${r.vehicles.model} · ` : ""}
                            {formatDateNumericSr(r.due_date)}
                          </Text>
                        </View>
                        <Text style={[styles.statusText, { color: tone }]}>{statusText}</Text>
                        <Pressable
                          onPress={() => deleteReminder(r.id, r.notification_id)}
                          hitSlop={8}
                          style={styles.rowDelete}
                        >
                          <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                        </Pressable>
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>

            {history.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Istorija održavanja</Text>
                <View style={{ gap: Spacing.sm }}>
                  {history.map((h) => (
                    <Card key={h.key} style={[styles.historyRow, { borderLeftWidth: 2, borderLeftColor: Colors.success }]}>
                      <Icon name="check-circle-outline" size={17} color={Colors.success} />
                      <View style={styles.reminderInfo}>
                        <Text style={styles.reminderTitle} numberOfLines={1}>{h.title}</Text>
                        <Text style={styles.reminderMeta} numberOfLines={1}>
                          {h.vehicleLabel ? `${h.vehicleLabel} · ` : ""}
                          {formatDateNumericSr(h.date)}
                        </Text>
                      </View>
                      {h.amount !== null && <Text style={styles.statusText}>{formatRSD(h.amount)}</Text>}
                    </Card>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!isEmpty && <Fab label="Dodaj podsetnik" onPress={() => router.push("/add-reminder")} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.textPrimary },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  checkMark: { padding: 2 },
  reminderInfo: { flex: 1, minWidth: 0 },
  reminderTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  reminderMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statusText: { ...Typography.tag, color: Colors.textSecondary },
  rowDelete: { marginLeft: Spacing.sm, padding: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
});
