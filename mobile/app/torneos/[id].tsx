import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../../src/api/client";
import { useSession } from "../../src/auth/session";
import type { MobilePartido } from "../../src/api/types";
import { filtrarPartidos, type FiltroPartido } from "../../../lib/mobile/partidoFilters";

const RONDA: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

const FILTROS: { key: FiltroPartido; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "en_curso", label: "En curso" },
  { key: "pendientes", label: "Pendientes" },
  { key: "todos", label: "Todos" },
];

export default function PartidosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
  const router = useRouter();
  const [partidos, setPartidos] = useState<MobilePartido[]>([]);
  const [filtro, setFiltro] = useState<FiltroPartido>("hoy");

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/mobile/torneos/${id}/partidos`, accessToken)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setPartidos(data.partidos ?? []);
      });
  }, [id, accessToken]);

  const visibles = useMemo(
    () => filtrarPartidos(partidos, filtro, new Date()),
    [partidos, filtro]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/qr")}>
          <Text style={styles.link}>QR</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filtro === f.key && styles.chipActive]}
            onPress={() => setFiltro(f.key)}
          >
            <Text style={[styles.chipText, filtro === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={visibles}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>Sin partidos</Text>}
        renderItem={({ item: p }) => (
          <Link href={`/partido/${p.id}`} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.meta}>
                {p.categoria} · {RONDA[p.ronda] ?? p.ronda}
              </Text>
              <Text style={styles.names}>
                {p.jugador1?.apellido ?? "—"} vs {p.jugador2?.apellido ?? "—"}
              </Text>
              <Text style={styles.sub}>
                {p.hora_inicio ? new Date(p.hora_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "Sin hora"}
                {p.cancha ? ` · C${p.cancha}` : ""}
              </Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  header: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  link: { color: "#c8ff00" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#444" },
  chipActive: { backgroundColor: "#c8ff0020", borderColor: "#c8ff00" },
  chipText: { color: "#888", fontSize: 13 },
  chipTextActive: { color: "#c8ff00" },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, marginBottom: 8 },
  meta: { color: "#c8ff00", fontSize: 11, textTransform: "uppercase" },
  names: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 4 },
  sub: { color: "#888", fontSize: 12, marginTop: 4 },
});
