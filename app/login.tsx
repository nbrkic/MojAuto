import { supabase } from "@/lib/supabase";
import { useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== "" && password.length >= 6;

  async function handleSubmit() {
    setLoading(true);
    const { error } = isRegistering
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
    setLoading(false);

    if (error) {
      Alert.alert("Greška", error.message);
      return;
    }

    if (isRegistering) {
      Alert.alert("Uspešno", "Proveri email za potvrdu naloga, pa se uloguj.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MojAuto</Text>
      <Text style={styles.subtitle}>
        {isRegistering ? "Napravi nalog" : "Uloguj se"}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Lozinka (min 6 karaktera)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={[
          styles.button,
          (!canSubmit || loading) && styles.buttonDisabled,
        ]}
        disabled={!canSubmit || loading}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>
          {loading ? "..." : isRegistering ? "Registruj se" : "Uloguj se"}
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsRegistering((v) => !v)}>
        <Text style={styles.switchText}>
          {isRegistering
            ? "Već imaš nalog? Uloguj se"
            : "Nemaš nalog? Registruj se"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center" },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { color: "#208AEF", textAlign: "center", marginTop: 16 },
});
