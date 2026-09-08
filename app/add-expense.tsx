import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORIES } from "@/constants/categories";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { getFuelGrades } from "@/constants/vehicle-options";
import { toDateKey } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { checkMileageServiceDue } from "@/lib/vehicle-notifications";
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

type Vehicle = { id: number; make: string; model: string; fuel_type: string | null; mileage: number; archived: boolean };

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [fuelGrade, setFuelGrade] = useState<string | null>(null);
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [mileageAtFillup, setMileageAtFillup] = useState("");
  const [isFullTank, setIsFullTank] = useState(true);
  const [saving, setSaving] = useState(false);
  const prevVehicleIdRef = useRef<number | null>(null);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("id, make, model, fuel_type, mileage, archived")
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          showToast(error.message, "error");
          setVehiclesLoaded(true);
          return;
        }
        const list = data ?? [];
        setVehicles(list);
        if (editingId === null) {
          const selectable = list.filter((v) => !v.archived);
          if (selectable.length > 0) setVehicleId(selectable[0].id);
        }
        setVehiclesLoaded(true);
      });
  }, [showToast, editingId]);

  useEffect(() => {
    if (editingId === null) return;
    supabase
      .from("expenses")
      .select("vehicle_id, category, note, amount, date, fuel_grade, liters, price_per_liter, mileage_at_fillup, is_full_tank")
      .eq("id", editingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          showToast("Trošak nije pronađen", "error");
          router.back();
          return;
        }
        setVehicleId(data.vehicle_id);
        setCategory(data.category);
        setNote(data.note ?? "");
        setAmount(String(data.amount));
        setDate(parseDateKey(data.date));
        setFuelGrade(data.fuel_grade);
        setLiters(data.liters !== null ? String(data.liters) : "");
        setPricePerLiter(data.price_per_liter !== null ? String(data.price_per_liter) : "");
        setMileageAtFillup(data.mileage_at_fillup !== null ? String(data.mileage_at_fillup) : "");
        setIsFullTank(data.is_full_tank ?? true);
        prevVehicleIdRef.current = data.vehicle_id;
      });
  }, [editingId, router, showToast]);

  const isFuel = category === "Gorivo";
  const selectableVehicles = editingId !== null ? vehicles : vehicles.filter((v) => !v.archived);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  useEffect(() => {
    if (!isFuel) {
      setFuelGrade(null);
      setLiters("");
      setPricePerLiter("");
      setMileageAtFillup("");
      setIsFullTank(true);
    }
  }, [isFuel]);

  useEffect(() => {
    if (prevVehicleIdRef.current !== null && prevVehicleIdRef.current !== vehicleId) {
      setFuelGrade(null);
    }
    prevVehicleIdRef.current = vehicleId;
  }, [vehicleId]);

  useEffect(() => {
    if (editingId !== null) return;
    if (isFuel && selectedVehicle && mileageAtFillup.trim() === "") {
      setMileageAtFillup(String(selectedVehicle.mileage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFuel, selectedVehicle?.id, editingId]);

  function onLitersChange(text: string) {
    setLiters(text);
    const l = Number(text.replace(",", "."));
    const p = Number(pricePerLiter.replace(",", "."));
    if (text.trim() !== "" && Number.isFinite(l) && l > 0 && pricePerLiter.trim() !== "" && Number.isFinite(p) && p > 0) {
      setAmount(String(Math.round(l * p)));
    }
  }

  function onPricePerLiterChange(text: string) {
    setPricePerLiter(text);
    const p = Number(text.replace(",", "."));
    const l = Number(liters.replace(",", "."));
    if (text.trim() !== "" && Number.isFinite(p) && p > 0 && liters.trim() !== "" && Number.isFinite(l) && l > 0) {
      setAmount(String(Math.round(l * p)));
    }
  }

  function onAmountChange(text: string) {
    setAmount(text);
    if (!isFuel) return;
    const a = Number(text.replace(",", "."));
    const l = Number(liters.replace(",", "."));
    if (
      text.trim() !== "" &&
      Number.isFinite(a) &&
      a > 0 &&
      liters.trim() !== "" &&
      Number.isFinite(l) &&
      l > 0 &&
      pricePerLiter.trim() === ""
    ) {
      setPricePerLiter(String(Math.round((a / l) * 100) / 100));
    }
  }

  const canSave =
    vehicleId !== null &&
    category !== null &&
    amount.trim() !== "" &&
    Number(amount) > 0 &&
    (!isFuel ||
      (liters.trim() !== "" &&
        Number(liters.replace(",", ".")) > 0 &&
        mileageAtFillup.trim() !== "" &&
        Number(mileageAtFillup) >= 0));

  async function handleSave() {
    if (!selectedVehicle) return;
    setSaving(true);

    const litersNum = isFuel ? Number(liters.replace(",", ".")) : null;
    const amountNum = Number(amount);
    const mileageNum = isFuel ? Number(mileageAtFillup) : null;
    const priceNum = isFuel
      ? pricePerLiter.trim()
        ? Number(pricePerLiter.replace(",", "."))
        : litersNum && litersNum > 0
          ? Math.round((amountNum / litersNum) * 100) / 100
          : null
      : null;

    const payload = {
      vehicle_id: vehicleId,
      category,
      amount: amountNum,
      date: toDateKey(date),
      note: note.trim() || null,
      fuel_grade: isFuel ? fuelGrade : null,
      liters: litersNum,
      price_per_liter: priceNum,
      mileage_at_fillup: mileageNum,
      is_full_tank: isFuel ? isFullTank : null,
    };

    const { error } =
      editingId !== null
        ? await supabase.from("expenses").update(payload).eq("id", editingId)
        : await supabase.from("expenses").insert(payload);

    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    if (isFuel && mileageNum !== null && mileageNum > selectedVehicle.mileage) {
      const previousMileage = selectedVehicle.mileage;
      await supabase.from("vehicles").update({ mileage: mileageNum }).eq("id", selectedVehicle.id);
      checkMileageServiceDue(
        selectedVehicle.id,
        `${selectedVehicle.make} ${selectedVehicle.model}`,
        previousMileage,
        mileageNum,
      );
    }

    setSaving(false);
    showToast(editingId !== null ? "Trošak izmenjen" : "Trošak sačuvan");
    router.back();
  }

  if (vehiclesLoaded && selectableVehicles.length === 0 && editingId === null) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { marginTop: insets.top + Spacing.md }]}>
          <Text style={styles.title}>Dodaj trošak</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <EmptyState
          icon="car-side"
          title="Prvo dodaj vozilo"
          subtitle="Trošak mora biti vezan za neko vozilo."
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
          <Text style={styles.title}>{editingId !== null ? "Izmeni trošak" : "Dodaj trošak"}</Text>
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
            options={selectableVehicles.map((v) => ({ value: v.id, label: `${v.make} ${v.model}`, icon: "car-side" as const }))}
          />
          <SelectField
            label="Kategorija"
            placeholder="Izaberi kategoriju"
            value={category}
            onChange={setCategory}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c.key, label: c.label, icon: c.icon, color: c.color }))}
          />
          {isFuel && (
            <>
              <SelectField
                label="Vrsta goriva (opciono)"
                placeholder="Izaberi vrstu goriva"
                value={fuelGrade}
                onChange={setFuelGrade}
                options={getFuelGrades(selectedVehicle?.fuel_type)}
              />
              <TextField
                label="Broj litara"
                placeholder="npr. 45"
                value={liters}
                onChangeText={onLitersChange}
                keyboardType="decimal-pad"
              />
              <TextField
                label="Cena po litru (RSD, opciono)"
                placeholder="npr. 197.5"
                value={pricePerLiter}
                onChangeText={onPricePerLiterChange}
                keyboardType="decimal-pad"
              />
              <TextField
                label="Kilometraža pri sipanju"
                placeholder="npr. 142350"
                value={mileageAtFillup}
                onChangeText={setMileageAtFillup}
                keyboardType="number-pad"
              />
              <SwitchRow
                label="Rezervoar napunjen do kraja"
                description="Uključi ako si napunio do vrha — potrebno za tačan obračun potrošnje."
                value={isFullTank}
                onChange={setIsFullTank}
              />
            </>
          )}
          <TextField
            label="Naziv (opciono)"
            placeholder="npr. Mali servis"
            value={note}
            onChangeText={setNote}
          />
          <TextField
            label={isFuel ? "Ukupna cena (RSD)" : "Cena (RSD)"}
            placeholder="npr. 12500"
            value={amount}
            onChangeText={onAmountChange}
            keyboardType="decimal-pad"
          />
          <DateField label="Datum" value={date} onChange={setDate} maximumDate={new Date()} />

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
