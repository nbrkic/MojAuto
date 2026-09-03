import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { DOCUMENT_CATEGORIES, getDocumentCategory } from "@/constants/document-categories";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { uploadVehicleDocument } from "@/lib/vehicle-documents";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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
type PickedFile = { uri: string; type: "image" | "pdf"; name: string | null };

export default function AddDocumentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { session } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
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

  async function pickFromCamera() {
    setPickerVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Nema dozvole", "Dozvoli pristup kameri da bi uslikao dokument.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setFile({ uri: result.assets[0].uri, type: "image", name: null });
    }
  }

  async function pickFromLibrary() {
    setPickerVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Nema dozvole", "Dozvoli pristup galeriji da bi izabrao fotografiju.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setFile({ uri: result.assets[0].uri, type: "image", name: null });
    }
  }

  async function pickPdf() {
    setPickerVisible(false);
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets[0]) {
      setFile({ uri: result.assets[0].uri, type: "pdf", name: result.assets[0].name });
    }
  }

  const canSave = vehicleId !== null && category !== null && file !== null;

  async function handleSave() {
    if (!file || !session?.user?.id) return;
    setSaving(true);
    try {
      const fileUrl = await uploadVehicleDocument(file.uri, session.user.id, file.name ?? undefined);
      const { error } = await supabase.from("documents").insert({
        vehicle_id: vehicleId,
        category,
        title: title.trim() || getDocumentCategory(category).label,
        file_url: fileUrl,
        file_type: file.type,
      });
      if (error) throw error;
      showToast("Dokument sačuvan");
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Greška pri čuvanju dokumenta", "error");
    } finally {
      setSaving(false);
    }
  }

  if (vehiclesLoaded && vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { marginTop: insets.top + Spacing.md }]}>
          <Text style={styles.title}>Dodaj dokument</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <EmptyState icon="car-side" title="Prvo dodaj vozilo" subtitle="Dokument mora biti vezan za neko vozilo." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Dodaj dokument</Text>
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
            <SelectField
              label="Kategorija"
              placeholder="Izaberi kategoriju"
              value={category}
              onChange={setCategory}
              options={DOCUMENT_CATEGORIES.map((c) => ({ value: c.key, label: c.label, icon: c.icon, color: c.color }))}
            />
            <TextField
              label="Naziv (opciono)"
              placeholder="npr. Saobraćajna dozvola"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Fajl</Text>
            <Pressable onPress={() => setPickerVisible(true)} style={styles.filePicker}>
              {file ? (
                file.type === "image" ? (
                  <Image source={{ uri: file.uri }} style={styles.filePreviewImage} contentFit="cover" />
                ) : (
                  <View style={styles.pdfPreview}>
                    <Icon name="file-pdf-box" size={28} color={Colors.accent} />
                    <Text style={styles.pdfName} numberOfLines={1}>{file.name ?? "Dokument.pdf"}</Text>
                  </View>
                )
              ) : (
                <View style={styles.filePlaceholder}>
                  <Icon name="file-plus-outline" size={24} color={Colors.textTertiary} />
                  <Text style={styles.filePlaceholderText}>Dodaj sliku ili PDF</Text>
                </View>
              )}
            </Pressable>

            <Button title="Sačuvaj" onPress={handleSave} disabled={!canSave} loading={saving} style={{ marginTop: Spacing.lg }} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <BottomSheet visible={pickerVisible} onClose={() => setPickerVisible(false)} title="Dodaj fajl">
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          <Pressable onPress={pickFromCamera} style={styles.optionRow}>
            <Icon name="camera-outline" size={19} color={Colors.textSecondary} />
            <Text style={styles.optionLabel}>Slikaj</Text>
          </Pressable>
          <Pressable onPress={pickFromLibrary} style={styles.optionRow}>
            <Icon name="image-plus" size={19} color={Colors.textSecondary} />
            <Text style={styles.optionLabel}>Izaberi iz galerije</Text>
          </Pressable>
          <Pressable onPress={pickPdf} style={styles.optionRow}>
            <Icon name="file-pdf-box" size={19} color={Colors.textSecondary} />
            <Text style={styles.optionLabel}>Izaberi PDF fajl</Text>
          </Pressable>
        </View>
      </BottomSheet>
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
  label: { ...Typography.eyebrow, color: Colors.textSecondary, marginBottom: Spacing.sm },
  filePicker: {
    height: 140,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  filePreviewImage: { width: "100%", height: "100%" },
  filePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  filePlaceholderText: { ...Typography.caption, color: Colors.textTertiary },
  pdfPreview: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  pdfName: { ...Typography.caption, color: Colors.textSecondary },
  optionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.md },
  optionLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
});
