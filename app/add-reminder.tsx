import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { NOTIFY_DAYS_BEFORE_OPTIONS } from "@/constants/reminder-options";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { toDateKey } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { scheduleReminderNotification } from "@/notifications/reminders";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = { id: number; make: string; model: string };

export default function AddReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState<number | null>(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("id, make, model")
      .eq("archived", false)
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          showToast(error.message, "error");
          setVehiclesLoaded(true);
          return;
        }
        setVehicles(data ?? []);
        if (data && data.length > 0) setVehicleId(data[0].id);
        setVehiclesLoaded(true);
      });
  }, [showToast]);

  const canSave = vehicleId !== null && title.trim() !== "";

  async function handleSave() {
    setSaving(true);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const dueDateKey = toDateKey(dueDate);
    const notificationId = notifyEnabled
      ? await scheduleReminderNotification(
          title.trim(),
          vehicle ? `${vehicle.make} ${vehicle.model}` : "",
          dueDateKey,
          notifyDaysBefore ?? 0,
        )
      : null;

    const { error } = await supabase.from("reminders").insert({
      vehicle_id: vehicleId,
      title: title.trim(),
      due_date: dueDateKey,
      notification_id: notificationId,
    });

    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Podsetnik sačuvan");
    router.back();
  }

  if (vehiclesLoaded && vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { marginTop: insets.top + Spacing.md }]}>
          <Text style={styles.title}>Dodaj podsetnik</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <EmptyState
          icon="car-side"
          title="Prvo dodaj vozilo"
          subtitle="Podsetnik mora biti vezan za neko vozilo."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dodaj podsetnik</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.form}>
          <SelectField
            label="Vozilo"
            placeholder="Izaberi vozilo"
            value={vehicleId}
            onChange={setVehicleId}
            options={vehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model}`, icon: "car-side" as const }))}
          />
          <TextField
            label="Šta treba uraditi"
            placeholder="npr. Zamena ulja"
            value={title}
            onChangeText={setTitle}
          />
          <DateField label="Datum" value={dueDate} onChange={setDueDate} />

          <SwitchRow
            label="Pošalji obaveštenje"
            description="Dobićeš podsetnik u aplikaciji pre roka."
            value={notifyEnabled}
            onChange={setNotifyEnabled}
          />
          {notifyEnabled && (
            <SelectField
              label="Kada da te obavestimo"
              placeholder="Izaberi"
              value={notifyDaysBefore}
              onChange={setNotifyDaysBefore}
              options={NOTIFY_DAYS_BEFORE_OPTIONS}
            />
          )}

          <Button title="Sačuvaj" onPress={handleSave} disabled={!canSave} loading={saving} />
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: { ...Typography.h2, color: Colors.textPrimary },
  form: { paddingHorizontal: Spacing.xl },
});
