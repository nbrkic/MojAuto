import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.length >= 6;

  async function handleSubmit() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Icon name="car-sports" size={30} color={Colors.accent} />
          </View>
          <Text style={styles.brandTitle}>MojAuto</Text>
          <View style={styles.brandRule} />
          <Text style={styles.brandSubtitle}>Sve o tvom automobilu, na jednom mestu</Text>
        </View>

        <View style={styles.form}>
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
            title="Uloguj se"
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
            style={{ marginTop: Spacing.sm }}
          />

          <Pressable onPress={() => router.push("/register")} style={styles.switchButton}>
            <Text style={styles.switchText}>
              Nemaš nalog? <Text style={styles.switchTextAccent}>Registruj se</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxxl },
  brand: { alignItems: "center", marginBottom: Spacing.xxxl },
  brandMark: {
    width: 64,
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  brandTitle: { ...Typography.display, color: Colors.textPrimary },
  brandRule: { width: 40, height: 2, backgroundColor: Colors.accent, marginTop: Spacing.md },
  brandSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  form: { width: "100%" },
  switchButton: { marginTop: Spacing.xl, alignItems: "center" },
  switchText: { ...Typography.body, color: Colors.textSecondary },
  switchTextAccent: { color: Colors.accent, fontFamily: Typography.bodyMedium.fontFamily },
});
