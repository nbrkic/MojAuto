import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { addReminderToDeviceCalendar } from "@/lib/calendar";
import { daysUntil, formatDateNumericSr, formatRSD } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cancelReminderNotification } from "@/notifications/reminders";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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

type NoteRow = {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
};

type Tab = "active" | "overdue" | "notes";

export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const hasLoadedRef = useRef(false);

  const [addNoteVisible, setAddNoteVisible] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null);

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
      supabase.from("notes").select("id, title, content, created_at").order("created_at", { ascending: false }),
    ]).then(([activeRes, doneRes, expenseRes, notesRes]) => {
      hasLoadedRef.current = true;
      if (activeRes.error) {
        showToast(activeRes.error.message, "error");
        setLoading(false);
        return;
      }
      setReminders((activeRes.data ?? []) as unknown as ReminderRow[]);
      setNotes(notesRes.data ?? []);

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

  const activeReminders = useMemo(() => reminders.filter((r) => daysUntil(r.due_date) >= 0), [reminders]);
  const overdueReminders = useMemo(() => reminders.filter((r) => daysUntil(r.due_date) < 0), [reminders]);

  function toggleChecked(id: number) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markDone(id: number, notificationId: string | null) {
    if (notificationId) await cancelReminderNotification(notificationId);
    const { error } = await supabase.from("reminders").update({ is_done: true }).eq("id", id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast("Označeno kao završeno");
    load();
  }

  async function addToCalendar(r: ReminderRow) {
    const vehicleLabel = r.vehicles ? `${r.vehicles.make} ${r.vehicles.model}` : null;
    const result = await addReminderToDeviceCalendar(r.title, r.due_date, vehicleLabel);
    if (result === "saved") showToast("Dodato u kalendar");
    else if (result === "error") showToast("Nije uspelo dodavanje u kalendar", "error");
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

  async function handleSaveNote() {
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("notes").insert({
      title: noteTitle.trim(),
      content: noteContent.trim() || null,
    });
    setSavingNote(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setNoteTitle("");
    setNoteContent("");
    setAddNoteVisible(false);
    setTab("notes");
    showToast("Beleška sačuvana");
    load();
  }

  function deleteNote(id: number) {
    Alert.alert("Obriši belešku?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("notes").delete().eq("id", id);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          showToast("Beleška obrisana");
          load();
        },
      },
    ]);
  }

  const isEmpty = !loading && reminders.length === 0 && history.length === 0 && notes.length === 0;

  function renderReminderRow(r: ReminderRow) {
    const days = daysUntil(r.due_date);
    const overdue = days < 0;
    const soon = days >= 0 && days <= 7;
    const tone = overdue ? Colors.danger : soon ? Colors.warning : Colors.accent;
    const statusText = overdue ? "Isteklo" : days === 0 ? "Danas" : `Za ${days} ${days === 1 ? "dan" : "dana"}`;
    const isChecked = checkedIds.has(r.id);
    return (
      <Card key={r.id} style={[styles.reminderCard, { borderLeftWidth: 2, borderLeftColor: tone }]}>
        <View style={styles.reminderTopRow}>
          <Pressable onPress={() => toggleChecked(r.id)} style={styles.checkMark} hitSlop={8}>
            <Icon
              name={isChecked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={20}
              color={isChecked ? Colors.success : Colors.textTertiary}
            />
          </Pressable>
          <Text style={[styles.reminderTitle, { flex: 1 }]} numberOfLines={1}>{r.title}</Text>
          {isChecked ? (
            <Pressable onPress={() => markDone(r.id, r.notification_id)} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Završeno</Text>
            </Pressable>
          ) : (
            <Text style={[styles.statusText, { color: tone }]}>{statusText}</Text>
          )}
        </View>
        <View style={styles.reminderBottomRow}>
          <Text style={[styles.reminderMeta, { flex: 1, marginTop: 0 }]} numberOfLines={1}>
            {r.vehicles ? `${r.vehicles.make} ${r.vehicles.model} · ` : ""}
            {formatDateNumericSr(r.due_date)}
          </Text>
          <Pressable onPress={() => addToCalendar(r)} hitSlop={8} style={styles.rowAction}>
            <Icon name="calendar-plus" size={18} color={Colors.textTertiary} />
          </Pressable>
          <Pressable onPress={() => deleteReminder(r.id, r.notification_id)} hitSlop={8} style={styles.rowAction}>
            <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Obaveze</Text>
          {tab === "notes" ? (
            <Pressable onPress={() => setAddNoteVisible(true)} style={styles.addButton}>
              <Icon name="plus" size={16} color={Colors.background} />
              <Text style={styles.addButtonText}>Nova beleška</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push("/add-reminder")} style={styles.addButton}>
              <Icon name="plus" size={16} color={Colors.background} />
              <Text style={styles.addButtonText}>Dodaj podsetnik</Text>
            </Pressable>
          )}
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
              <View style={styles.tabRow}>
                <Pressable
                  onPress={() => setTab("active")}
                  style={[styles.tabButton, tab === "active" && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, tab === "active" && styles.tabButtonTextActive]}>
                    Aktivna ({activeReminders.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTab("overdue")}
                  style={[styles.tabButton, tab === "overdue" && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, tab === "overdue" && styles.tabButtonTextActive]}>
                    Isteklo ({overdueReminders.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTab("notes")}
                  style={[styles.tabButton, tab === "notes" && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, tab === "notes" && styles.tabButtonTextActive]}>
                    Beleške ({notes.length})
                  </Text>
                </Pressable>
              </View>
            </View>

            {tab === "active" && (
              <View style={styles.section}>
                {activeReminders.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyText}>Nema aktivnih podsetnika.</Text>
                  </Card>
                ) : (
                  <View style={{ gap: Spacing.sm }}>{activeReminders.map(renderReminderRow)}</View>
                )}
              </View>
            )}

            {tab === "overdue" && (
              <View style={styles.section}>
                {overdueReminders.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyText}>Nema isteklih podsetnika.</Text>
                  </Card>
                ) : (
                  <View style={{ gap: Spacing.sm }}>{overdueReminders.map(renderReminderRow)}</View>
                )}
              </View>
            )}

            {tab === "notes" && (
              <View style={styles.section}>
                {notes.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyText}>Još nema beležaka.</Text>
                  </Card>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    {notes.map((n) => (
                      <Card key={n.id} onPress={() => setSelectedNote(n)} style={styles.noteRow}>
                        <View style={styles.reminderInfo}>
                          <Text style={styles.reminderTitle} numberOfLines={1}>{n.title}</Text>
                          {n.content && (
                            <Text style={styles.reminderMeta} numberOfLines={2}>{n.content}</Text>
                          )}
                        </View>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteNote(n.id);
                          }}
                          hitSlop={8}
                          style={styles.rowDelete}
                        >
                          <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                        </Pressable>
                      </Card>
                    ))}
                  </View>
                )}
              </View>
            )}

            {tab !== "notes" && history.length > 0 && (
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

      <BottomSheet
        visible={addNoteVisible}
        onClose={() => setAddNoteVisible(false)}
        title="Nova beleška"
        fixedHeight
      >
        <View style={{ paddingBottom: Spacing.lg }}>
          <TextField label="Naslov" placeholder="npr. Šifra alarma" value={noteTitle} onChangeText={setNoteTitle} autoFocus />
          <TextField
            label="Sadržaj (opciono)"
            placeholder="Detalji..."
            value={noteContent}
            onChangeText={setNoteContent}
            multiline
            numberOfLines={4}
            style={styles.noteContentInput}
          />
          <Button title="Sačuvaj" onPress={handleSaveNote} disabled={!noteTitle.trim()} loading={savingNote} />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        title={selectedNote?.title ?? "Beleška"}
      >
        <View style={{ paddingBottom: Spacing.lg }}>
          <Text style={styles.noteFullContent}>
            {selectedNote?.content?.trim() || "Nema dodatnog sadržaja."}
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h1, color: Colors.textPrimary },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  addButtonText: { ...Typography.button, color: Colors.background },
  tabRow: { flexDirection: "row", gap: Spacing.sm },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
  },
  tabButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabButtonText: { ...Typography.tag, color: Colors.textSecondary },
  tabButtonTextActive: { color: Colors.background },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  reminderCard: { gap: Spacing.sm },
  reminderTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  reminderBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  rowAction: { padding: 4 },
  confirmButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  confirmButtonText: { ...Typography.tag, color: Colors.background },
  checkMark: { padding: 2 },
  reminderInfo: { flex: 1, minWidth: 0 },
  reminderTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  reminderMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statusText: { ...Typography.tag, color: Colors.textSecondary },
  rowDelete: { marginLeft: Spacing.sm, padding: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  noteRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  noteContentInput: { height: 140, textAlignVertical: "top" },
  noteFullContent: { ...Typography.body, color: Colors.textPrimary, lineHeight: 22 },
});
