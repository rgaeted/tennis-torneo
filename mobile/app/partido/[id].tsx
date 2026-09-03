import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VolumeManager } from "react-native-volume-manager";
import { apiFetch } from "../../src/api/client";
import { useSession } from "../../src/auth/session";
import { useLiveScore } from "../../src/live/useLiveScore";
import { useDeviceBindings } from "../../src/bluetooth/useDeviceBindings";
import type { MobilePartido } from "../../src/api/types";
import {
  playerForKeyEvent,
  shouldAcceptPress,
  DEFAULT_DEBOUNCE_MS,
} from "../../../lib/live/buttonBindings";
import type { Player } from "../../../lib/live/types";

export default function ControlScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
  const router = useRouter();
  const [partido, setPartido] = useState<MobilePartido | null>(null);
  const { bindings } = useDeviceBindings();
  const lastPress = useRef(0);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/mobile/partidos/${id}`, accessToken)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setPartido(data.partido);
      });
  }, [id, accessToken]);

  const live = useLiveScore(id ?? "", accessToken, partido);
  const cerrado = !!partido?.ganador_id;

  useEffect(() => {
    const sub = VolumeManager.addVolumeListener(() => {
      const now = Date.now();
      if (!shouldAcceptPress(lastPress.current, now, DEFAULT_DEBOUNCE_MS)) return;
      const player = playerForKeyEvent(
        { code: "AudioVolumeUp", key: "VolumeUp" },
        bindings
      );
      if (!player || cerrado) return;
      lastPress.current = now;
      live.addPunto(player);
    });
    return () => sub.remove();
  }, [bindings, cerrado, live.addPunto]);

  function btn(player: Player, label: string, fn: () => void) {
    return (
      <Pressable
        style={[styles.bigBtn, player === "j1" ? styles.j1 : styles.j2]}
        onPress={fn}
        disabled={cerrado || live.saving}
      >
        <Text style={styles.bigBtnText}>{label}</Text>
      </Pressable>
    );
  }

  async function onFinalizar() {
    Alert.alert("Cerrar partido", "¿Confirmar resultado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          const ok = await live.finalizar();
          if (ok) router.back();
        },
      },
    ]);
  }

  if (!partido) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Cargando…</Text>
      </View>
    );
  }

  const j1 = `${partido.jugador1?.nombre} ${partido.jugador1?.apellido}`;
  const j2 = `${partido.jugador2?.nombre} ${partido.jugador2?.apellido}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        {partido.categoria} · {partido.ronda}
      </Text>
      {cerrado && <Text style={styles.banner}>Partido cerrado</Text>}
      {live.saving && <Text style={styles.muted}>Guardando…</Text>}
      {live.error && <Text style={styles.error}>{live.error}</Text>}

      <View style={styles.scoreRow}>
        <View style={styles.col}>
          <Text style={styles.name}>{j1}</Text>
          <Text style={styles.games}>{live.setActual.j1}</Text>
          {!live.tb && <Text style={styles.puntos}>{live.formatPuntos()}</Text>}
          {btn("j1", "+ Punto", () => live.addPunto("j1"))}
          {btn("j1", "− Punto", () => live.subPunto("j1"))}
          {btn("j1", "+ Juego", () => live.updateGame("j1", 1))}
          {btn("j1", "− Juego", () => live.updateGame("j1", -1))}
        </View>
        <View style={styles.col}>
          <Text style={styles.name}>{j2}</Text>
          <Text style={styles.games}>{live.setActual.j2}</Text>
          {!live.tb && <Text style={styles.puntos}>{live.formatPuntos()}</Text>}
          {btn("j2", "+ Punto", () => live.addPunto("j2"))}
          {btn("j2", "− Punto", () => live.subPunto("j2"))}
          {btn("j2", "+ Juego", () => live.updateGame("j2", 1))}
          {btn("j2", "− Juego", () => live.updateGame("j2", -1))}
        </View>
      </View>

      <View style={styles.sets}>
        {live.resultado.map((s, i) => (
          <Text key={i} style={styles.setLine}>
            Set {i + 1}: {s.j1}-{s.j2}
          </Text>
        ))}
      </View>

      {!cerrado && !live.matchOver && (
        <Pressable style={styles.finalBtn} onPress={onFinalizar}>
          <Text style={styles.finalBtnText}>Confirmar resultado</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 40 },
  meta: { color: "#c8ff00", textAlign: "center", marginBottom: 8 },
  banner: { color: "#888", textAlign: "center", marginBottom: 8 },
  muted: { color: "#666", textAlign: "center" },
  error: { color: "#f87171", textAlign: "center", marginBottom: 8 },
  scoreRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  col: { flex: 1, alignItems: "center" },
  name: { color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 8 },
  games: { color: "#c8ff00", fontSize: 48, fontWeight: "800" },
  puntos: { color: "#aaa", fontSize: 18, marginBottom: 12 },
  bigBtn: { width: "100%", padding: 12, borderRadius: 10, marginBottom: 8, alignItems: "center" },
  j1: { backgroundColor: "#1e3a5f" },
  j2: { backgroundColor: "#3a1e5f" },
  bigBtnText: { color: "#fff", fontWeight: "600" },
  sets: { marginTop: 24 },
  setLine: { color: "#888", textAlign: "center", marginBottom: 4 },
  finalBtn: { backgroundColor: "#c8ff00", borderRadius: 12, padding: 16, marginTop: 24 },
  finalBtnText: { color: "#000", fontWeight: "700", textAlign: "center" },
});
