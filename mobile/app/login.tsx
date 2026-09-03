import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useSession } from "../src/auth/session";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MisTorneos Staff</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Entrando…" : "Entrar"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 24, justifyContent: "center" },
  title: { color: "#c8ff00", fontSize: 28, fontWeight: "700", marginBottom: 32, textAlign: "center" },
  input: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    color: "#fff",
    padding: 14,
    marginBottom: 12,
  },
  error: { color: "#f87171", marginBottom: 12, textAlign: "center" },
  btn: { backgroundColor: "#c8ff00", borderRadius: 12, padding: 16, marginTop: 8 },
  btnText: { color: "#000", fontWeight: "700", textAlign: "center", fontSize: 16 },
});
