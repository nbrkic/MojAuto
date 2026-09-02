import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

type PhotoPickerProps = {
  label?: string;
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function PhotoPicker({ label, value, onChange }: PhotoPickerProps) {
  const [visible, setVisible] = useState(false);

  async function pickFromLibrary() {
    setVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Nema dozvole", "Dozvoli pristup galeriji da bi izabrao fotografiju.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  async function pickFromCamera() {
    setVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Nema dozvole", "Dozvoli pristup kameri da bi uslikao vozilo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={() => setVisible(true)} style={styles.frame}>
        {value ? (
          <Image source={{ uri: value }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="image-plus" size={24} color={Colors.textTertiary} />
            <Text style={styles.placeholderText}>Dodaj fotografiju</Text>
          </View>
        )}
      </Pressable>

      <BottomSheet visible={visible} onClose={() => setVisible(false)} title="Fotografija vozila">
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          <Pressable onPress={pickFromCamera} style={styles.optionRow}>
            <Icon name="camera-outline" size={19} color={Colors.textSecondary} />
            <Text style={styles.optionLabel}>Slikaj</Text>
          </Pressable>
          <Pressable onPress={pickFromLibrary} style={styles.optionRow}>
            <Icon name="image-plus" size={19} color={Colors.textSecondary} />
            <Text style={styles.optionLabel}>Izaberi iz galerije</Text>
          </Pressable>
          {value && (
            <Pressable
              onPress={() => {
                onChange(null);
                setVisible(false);
              }}
              style={styles.optionRow}
            >
              <Icon name="close-circle" size={19} color={Colors.danger} />
              <Text style={[styles.optionLabel, { color: Colors.danger }]}>Ukloni fotografiju</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: { ...Typography.eyebrow, color: Colors.textSecondary, marginBottom: Spacing.sm },
  frame: {
    height: 140,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  placeholderText: { ...Typography.caption, color: Colors.textTertiary },
  optionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.md },
  optionLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
});
