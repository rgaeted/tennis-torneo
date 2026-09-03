import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { apiFetch } from "../../src/api/client";
import { useSession } from "../../src/auth/session";
import type { MobileTorneo } from "../../src/api/types";

export default function TorneosScreen() {
  const { accessToken, signOut } = useSession();
  const router = useRouter();
  const [torneos, setTorneos] = useState<MobileTorneo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/mobile/torneos", accessToken)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error");
        setTorneos(data.torneos ?? []);
      })
      .catch((e) => setError(e.message));
  }, [accessToken]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Torneos</Text>
        <Pressable onPress={() => router.push("/qr")}>
          <Text style={styles.link}>QR</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/ajustes/pasador")}>
          <Text style={styles.link}>Pasador</Text>
        </Pressable>
        <Pressable onPress={signOut}>
          <Text style={styles.linkMuted}>Salir</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={torneos}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<Text style={styles.empty}>No hay torneos</Text>}
        renderItem={({ item }) => (
          <Link href={`/torneos/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.nombre}</Text>
              {item.fecha_inicio && (
                <Text style={styles.cardSub}>{item.fecha_inicio.slice(0, 10)}</Text>
              )}
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", flex: 1 },
  link: { color: "#c8ff00", fontSize: 14 },
  linkMuted: { color: "#888", fontSize: 14 },
  error: { color: "#f87171", marginBottom: 8 },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderColor: "#333",
    borderWidth: 1,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cardSub: { color: "#888", fontSize: 12, marginTop: 4 },
});
