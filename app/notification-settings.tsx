import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { NOTIFY_DAYS_BEFORE_OPTIONS } from "@/constants/reminder-options";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { formatNumberSr, toDateKey } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import {
  MALI_SERVIS_INTERVAL_KM,
  VELIKI_SERVIS_INTERVAL_KM,
  nextAnnualDueDate,
  nextMonthDayOccurrence,
} from "@/lib/vehicle-notifications";
import {
  cancelReminderNotification,
  scheduleFixedDateNotification,
  scheduleReminderNotification,
  sendImmediateNotification,
} from "@/notifications/reminders";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

type Vehicle = { make: string; model: string; mileage: number };

type ExistingIds = {
  tiresWinter: string | null;
  tiresSummer: string | null;
  registration: string | null;
  insurance: string | null;
};

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <Icon
        name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
        size={22}
        color={checked ? Colors.accent : Colors.textTertiary}
      />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  const [maliEnabled, setMaliEnabled] = useState(false);
  const [maliKm, setMaliKm] = useState("");
  const [velikiEnabled, setVelikiEnabled] = useState(false);
  const [velikiKm, setVelikiKm] = useState("");
  const [tiresEnabled, setTiresEnabled] = useState(false);
  const [regEnabled, setRegEnabled] = useState(false);
  const [regDate, setRegDate] = useState(new Date());
  const [regDaysBefore, setRegDaysBefore] = useState<number | null>(14);
  const [insEnabled, setInsEnabled] = useState(false);
  const [insDate, setInsDate] = useState(new Date());
  const [insDaysBefore, setInsDaysBefore] = useState<number | null>(14);

  const existingIdsRef = useRef<ExistingIds>({
    tiresWinter: null,
    tiresSummer: null,
    registration: null,
    insurance: null,
  });

  useEffect(() => {
    (async () => {
      const [{ data: vehicleData }, { data: settings }] = await Promise.all([
        supabase.from("vehicles").select("make, model, mileage").eq("id", vehicleId).single(),
        supabase
          .from("vehicle_notification_settings")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .maybeSingle(),
      ]);

      if (vehicleData) setVehicle(vehicleData);

      if (settings) {
        setMaliEnabled(settings.mali_servis_enabled);
        setMaliKm(settings.mali_servis_last_km !== null ? String(settings.mali_servis_last_km) : "");
        setVelikiEnabled(settings.veliki_servis_enabled);
        setVelikiKm(settings.veliki_servis_last_km !== null ? String(settings.veliki_servis_last_km) : "");
        setTiresEnabled(settings.tires_enabled);
        setRegEnabled(settings.registration_enabled);
        if (settings.registration_last_date) setRegDate(new Date(`${settings.registration_last_date}T00:00:00`));
        setRegDaysBefore(settings.registration_notify_days_before ?? 14);
        setInsEnabled(settings.insurance_enabled);
        if (settings.insurance_last_date) setInsDate(new Date(`${settings.insurance_last_date}T00:00:00`));
        setInsDaysBefore(settings.insurance_notify_days_before ?? 14);
        existingIdsRef.current = {
          tiresWinter: settings.tires_notification_id_winter,
          tiresSummer: settings.tires_notification_id_summer,
          registration: settings.registration_notification_id,
          insurance: settings.insurance_notification_id,
        };
      }
      setLoading(false);
    })();
  }, [vehicleId]);

  async function handleSave() {
    setSaving(true);
    const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

    const prev = existingIdsRef.current;
    const cancellations: Promise<void>[] = [];
    if (prev.tiresWinter) cancellations.push(cancelReminderNotification(prev.tiresWinter));
    if (prev.tiresSummer) cancellations.push(cancelReminderNotification(prev.tiresSummer));
    if (prev.registration) cancellations.push(cancelReminderNotification(prev.registration));
    if (prev.insurance) cancellations.push(cancelReminderNotification(prev.insurance));
    await Promise.all(cancellations);

    let tiresWinterId: string | null = null;
    let tiresSummerId: string | null = null;
    if (tiresEnabled) {
      [tiresWinterId, tiresSummerId] = await Promise.all([
        scheduleFixedDateNotification(
          "Zamena guma",
          `${vehicleName} — vreme je za zimske gume`,
          nextMonthDayOccurrence(11, 1),
        ),
        scheduleFixedDateNotification(
          "Zamena guma",
          `${vehicleName} — vreme je za letnje gume`,
          nextMonthDayOccurrence(4, 1),
        ),
      ]);
    }

    let registrationId: string | null = null;
    const regDateKey = regEnabled ? toDateKey(regDate) : null;
    if (regEnabled && regDateKey) {
      registrationId = await scheduleReminderNotification(
        "Registracija",
        vehicleName,
        nextAnnualDueDate(regDateKey),
        regDaysBefore ?? 0,
      );
    }

    let insuranceId: string | null = null;
    const insDateKey = insEnabled ? toDateKey(insDate) : null;
    if (insEnabled && insDateKey) {
      insuranceId = await scheduleReminderNotification(
        "Osiguranje",
        vehicleName,
        nextAnnualDueDate(insDateKey),
        insDaysBefore ?? 0,
      );
    }

    const payload = {
      vehicle_id: vehicleId,
      mali_servis_enabled: maliEnabled,
      mali_servis_last_km: maliEnabled && maliKm.trim() ? Number(maliKm) : null,
      veliki_servis_enabled: velikiEnabled,
      veliki_servis_last_km: velikiEnabled && velikiKm.trim() ? Number(velikiKm) : null,
      tires_enabled: tiresEnabled,
      tires_notification_id_winter: tiresWinterId,
      tires_notification_id_summer: tiresSummerId,
      registration_enabled: regEnabled,
      registration_last_date: regDateKey,
      registration_notify_days_before: regEnabled ? regDaysBefore : null,
      registration_notification_id: registrationId,
      insurance_enabled: insEnabled,
      insurance_last_date: insDateKey,
      insurance_notify_days_before: insEnabled ? insDaysBefore : null,
      insurance_notification_id: insuranceId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("vehicle_notification_settings")
      .upsert(payload, { onConflict: "vehicle_id" });

    if (!error && vehicle) {
      if (maliEnabled && maliKm.trim() && vehicle.mileage >= Number(maliKm) + MALI_SERVIS_INTERVAL_KM) {
        await sendImmediateNotification("Mali servis", `${vehicleName} — vreme je za mali servis`);
      }
      if (velikiEnabled && velikiKm.trim() && vehicle.mileage >= Number(velikiKm) + VELIKI_SERVIS_INTERVAL_KM) {
        await sendImmediateNotification("Veliki servis", `${vehicleName} — vreme je za veliki servis`);
      }
    }

    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Podešavanja obaveštenja sačuvana");
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Podešavanje obaveštenja</Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Icon name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.form}>
              <Skeleton height={300} radius={0} />
            </View>
          ) : (
            <View style={styles.form}>
              <Card style={styles.itemCard}>
                <CheckboxRow
                  label="Mali servis"
                  checked={maliEnabled}
                  onToggle={() => setMaliEnabled((v) => !v)}
                />
                {maliEnabled && (
                  <View style={styles.itemFields}>
                    <TextField
                      label="Kilometraža poslednjeg malog servisa"
                      placeholder="npr. 140000"
                      value={maliKm}
                      onChangeText={setMaliKm}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.itemNote}>
                      Obaveštenje stiže nakon {formatNumberSr(MALI_SERVIS_INTERVAL_KM)} pređenih km.
                    </Text>
                  </View>
                )}
              </Card>

              <Card style={styles.itemCard}>
                <CheckboxRow
                  label="Veliki servis"
                  checked={velikiEnabled}
                  onToggle={() => setVelikiEnabled((v) => !v)}
                />
                {velikiEnabled && (
                  <View style={styles.itemFields}>
                    <TextField
                      label="Kilometraža poslednjeg velikog servisa"
                      placeholder="npr. 140000"
                      value={velikiKm}
                      onChangeText={setVelikiKm}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.itemNote}>
                      Obaveštenje stiže nakon {formatNumberSr(VELIKI_SERVIS_INTERVAL_KM)} pređenih km.
                    </Text>
                  </View>
                )}
              </Card>

              <Card style={styles.itemCard}>
                <CheckboxRow
                  label="Zamena letnjih/zimskih guma"
                  checked={tiresEnabled}
                  onToggle={() => setTiresEnabled((v) => !v)}
                />
                {tiresEnabled && (
                  <View style={styles.itemFields}>
                    <Text style={styles.itemNote}>
                      Obaveštenje za zimske gume stiže 1. novembra, a za letnje 1. aprila.
                    </Text>
                  </View>
                )}
              </Card>

              <Card style={styles.itemCard}>
                <CheckboxRow label="Registracija" checked={regEnabled} onToggle={() => setRegEnabled((v) => !v)} />
                {regEnabled && (
                  <View style={styles.itemFields}>
                    <DateField label="Datum poslednje registracije" value={regDate} onChange={setRegDate} />
                    <SelectField
                      label="Kada da te obavestimo"
                      placeholder="Izaberi"
                      value={regDaysBefore}
                      onChange={setRegDaysBefore}
                      options={NOTIFY_DAYS_BEFORE_OPTIONS}
                    />
                  </View>
                )}
              </Card>

              <Card style={styles.itemCard}>
                <CheckboxRow label="Osiguranje" checked={insEnabled} onToggle={() => setInsEnabled((v) => !v)} />
                {insEnabled && (
                  <View style={styles.itemFields}>
                    <DateField label="Datum poslednjeg osiguranja" value={insDate} onChange={setInsDate} />
                    <SelectField
                      label="Kada da te obavestimo"
                      placeholder="Izaberi"
                      value={insDaysBefore}
                      onChange={setInsDaysBefore}
                      options={NOTIFY_DAYS_BEFORE_OPTIONS}
                    />
                  </View>
                )}
              </Card>

              <Button title="Sačuvaj" onPress={handleSave} loading={saving} />
            </View>
          )}
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
  title: { ...Typography.h2, color: Colors.textPrimary, flexShrink: 1 },
  form: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  itemCard: { marginBottom: 0 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  checkboxLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  itemFields: { marginTop: Spacing.lg },
  itemNote: { ...Typography.caption, color: Colors.textSecondary },
});
