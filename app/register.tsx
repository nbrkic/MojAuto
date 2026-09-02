import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "" && password.length >= 6;

  async function handleSubmit() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("Proveri email za potvrdu naloga, pa se uloguj.");
    router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.eyebrow}>Novi nalog</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Registracija</Text>
          <Text style={styles.subtitle}>Napravi nalog da bi pratio troškove i servise svog vozila.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Ime" placeholder="Marko" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Prezime" placeholder="Marković" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <TextField
            label="Email"
            placeholder="ime@primer.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label="Lozinka"
            placeholder="Minimum 6 karaktera"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Registruj se"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
            style={{ marginTop: Spacing.sm }}
          />

          <Pressable onPress={() => router.back()} style={styles.switchButton}>
            <Text style={styles.switchText}>
              Već imaš nalog? <Text style={styles.switchTextAccent}>Uloguj se</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginLeft: -Spacing.xs },
  eyebrow: { ...Typography.eyebrow, color: Colors.textTertiary },
  titleBlock: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  title: { ...Typography.display, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm },
  form: { paddingHorizontal: Spacing.xl },
  row: { flexDirection: "row", gap: Spacing.md },
  switchButton: { marginTop: Spacing.md, alignItems: "center" },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchTextAccent: { color: Colors.accent, fontFamily: Typography.bodyMedium.fontFamily },
});
