import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { formatRSD, formatTimeSr, toDateKey } from "@/lib/format";
import { PARKING_HOUR_MS, sendParkingSms } from "@/lib/parking";
import { supabase } from "@/lib/supabase";
import { cancelReminderNotification, scheduleFixedDateNotification } from "@/notifications/reminders";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ShortcutRow = {
  id: number;
  vehicle_id: number;
  title: string;
  phone_number: string;
  zone: string;
  limit_hours: number;
  price_per_hour: number | null;
  session_expires_at: string | null;
  session_hours_paid: number;
  notification_id: string | null;
  vehicles: { make: string; model: string; license_plate: string | null } | null;
};

function isActive(s: ShortcutRow): boolean {
  return !!s.session_expires_at && new Date(s.session_expires_at).getTime() > Date.now();
}

export default function ParkingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [shortcuts, setShortcuts] = useState<ShortcutRow[]>([]);
  const [selected, setSelected] = useState<ShortcutRow | null>(null);
  const [sending, setSending] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    supabase
      .from("parking_shortcuts")
      .select("*, vehicles(make, model, license_plate)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        hasLoadedRef.current = true;
        if (error) {
          showToast(error.message, "error");
          setLoading(false);
          return;
        }
        setShortcuts((data ?? []) as unknown as ShortcutRow[]);
        setLoading(false);
      });
  }, [showToast]);

  useFocusEffect(load);

  function deleteShortcut(s: ShortcutRow) {
    Alert.alert("Obriši prečicu?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          if (s.notification_id) await cancelReminderNotification(s.notification_id);
          const { error } = await supabase.from("parking_shortcuts").delete().eq("id", s.id);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          showToast("Prečica obrisana");
          load();
        },
      },
    ]);
  }

  async function handleConfirmSend() {
    if (!selected) return;
    const plate = selected.vehicles?.license_plate;
    if (!plate) {
      showToast("Vozilo nema registarsku tablicu", "error");
      return;
    }

    setSending(true);
    const result = await sendParkingSms(selected.phone_number, plate);
    setSending(false);

    if (result === "cancelled") {
      showToast("Slanje otkazano");
      return;
    }
    if (result === "unavailable") {
      showToast("SMS nije dostupan na ovom uređaju", "error");
      return;
    }

    const wasActive = isActive(selected);
    const baseTime = wasActive ? new Date(selected.session_expires_at!).getTime() : Date.now();
    const newExpiresAt = new Date(baseTime + PARKING_HOUR_MS);
    const newHoursPaid = (wasActive ? selected.session_hours_paid : 0) + 1;

    if (selected.notification_id) {
      await cancelReminderNotification(selected.notification_id);
    }
    const notification = await scheduleFixedDateNotification(
      "Parking ističe uskoro",
      `${selected.title} — ističe u ${formatTimeSr(newExpiresAt)}`,
      new Date(newExpiresAt.getTime() - 10 * 60 * 1000),
    );

    const { error } = await supabase
      .from("parking_shortcuts")
      .update({
        session_expires_at: newExpiresAt.toISOString(),
        session_hours_paid: newHoursPaid,
        notification_id: notification,
      })
      .eq("id", selected.id);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    if (selected.price_per_hour) {
      await supabase.from("expenses").insert({
        vehicle_id: selected.vehicle_id,
        category: "Parking",
        amount: selected.price_per_hour,
        date: toDateKey(new Date()),
        note: selected.zone,
      });
    }

    showToast("Parking plaćen");
    setSelected(null);
    load();
  }

  const activeSelected = selected ? isActive(selected) : false;
  const hoursPaidSelected = activeSelected ? (selected?.session_hours_paid ?? 0) : 0;
  const atLimit = selected ? hoursPaidSelected >= selected.limit_hours : false;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Parking</Text>
          <Pressable onPress={() => router.push("/add-parking-shortcut")} hitSlop={8} style={styles.headerButton}>
            <Icon name="plus" size={22} color={Colors.textPrimary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.section}>
            <Skeleton height={140} radius={0} />
          </View>
        ) : shortcuts.length === 0 ? (
          <EmptyState
            icon="parking"
            title="Još nema prečica za parking"
            subtitle="Napravi prečicu za vozilo i zonu da bi plaćao parking SMS-om iz aplikacije, jednim potvrđivanjem."
            actionLabel="+ Dodaj prečicu"
            onAction={() => router.push("/add-parking-shortcut")}
          />
        ) : (
          <View style={styles.section}>
            <View style={{ gap: Spacing.sm }}>
              {shortcuts.map((s) => {
                const active = isActive(s);
                return (
                  <Card
                    key={s.id}
                    onPress={() => setSelected(s)}
                    style={[styles.row, { borderLeftWidth: 2, borderLeftColor: active ? Colors.success : Colors.accent }]}
                  >
                    <View style={styles.rowIcon}>
                      <Icon name="parking" size={20} color={Colors.accent} />
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{s.title}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {s.vehicles ? `${s.vehicles.make} ${s.vehicles.model} · ` : ""}
                        {s.zone}
                      </Text>
                    </View>
                    {active ? (
                      <Text style={styles.activeText}>Ističe {formatTimeSr(new Date(s.session_expires_at!))}</Text>
                    ) : null}
                    <Pressable onPress={() => deleteShortcut(s)} hitSlop={8} style={styles.rowDelete}>
                      <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                    </Pressable>
                  </Card>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? "Parking"}>
        {selected && (
          <View style={{ paddingBottom: Spacing.lg }}>
            <Text style={styles.confirmText}>
              Šalje se SMS na broj {selected.phone_number} sa sadržajem "{selected.vehicles?.license_plate ?? "—"}".
            </Text>
            {activeSelected ? (
              <Text style={styles.confirmMeta}>
                Trenutni parking ističe u {formatTimeSr(new Date(selected.session_expires_at!))} ({hoursPaidSelected}/
                {selected.limit_hours}h). Slanje produžava za još 1h
                {selected.price_per_hour ? ` (${formatRSD(selected.price_per_hour)})` : ""}.
              </Text>
            ) : (
              <Text style={styles.confirmMeta}>
                Ovo pokreće parking na 1h (limit u ovoj zoni: {selected.limit_hours}h)
                {selected.price_per_hour ? ` za ${formatRSD(selected.price_per_hour)}` : ""}.
              </Text>
            )}
            {atLimit ? (
              <Text style={[styles.confirmMeta, { color: Colors.danger, marginTop: Spacing.sm }]}>
                Dostignut je limit od {selected.limit_hours}h za ovu zonu — ne možeš više produžiti.
              </Text>
            ) : (
              <Button title="Potvrdi" onPress={handleConfirmSend} loading={sending} style={{ marginTop: Spacing.lg }} />
            )}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary, flex: 1, textAlign: "center" },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  rowIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  activeText: { ...Typography.tag, color: Colors.success },
  rowDelete: { marginLeft: Spacing.sm, padding: 4 },
  confirmText: { ...Typography.body, color: Colors.textPrimary },
  confirmMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm },
});
