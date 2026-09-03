import { View, Text, Pressable, StyleSheet } from "react-native";
import { useDeviceBindings } from "../../src/bluetooth/useDeviceBindings";
import type { Player } from "../../../lib/live/types";

function Slot({
  label,
  player,
  bound,
  onAb,
  onClear,
}: {
  label: string;
  player: Player;
  bound: string | null;
  onAb: () => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotTitle}>{label}</Text>
      {bound ? (
        <View style={styles.row}>
          <Text style={styles.bound}>{bound}</Text>
          <Pressable onPress={onClear}>
            <Text style={styles.linkDanger}>Desconectar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.btn} onPress={onAb}>
          <Text style={styles.btnText}>AB Shutter3 (iPhone/Android)</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function PasadorScreen() {
  const { bindings, assignAbShutter3, clear } = useDeviceBindings();

  const label = (b: typeof bindings.j1) =>
    b?.kind === "hid" ? (b.code === "AudioVolumeUp" ? "AB Shutter3" : b.code) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pasador de puntos</Text>
      <Text style={styles.help}>
        Empareja el mando en Bluetooth del teléfono. Luego asigna cada botón a un jugador. En
        control, Volume Up / obturador suma punto.
      </Text>
      <Slot
        label="Jugador 1 (izquierda en control)"
        player="j1"
        bound={label(bindings.j1)}
        onAb={() => assignAbShutter3("j1")}
        onClear={() => clear("j1")}
      />
      <Slot
        label="Jugador 2 (derecha en control)"
        player="j2"
        bound={label(bindings.j2)}
        onAb={() => assignAbShutter3("j2")}
        onClear={() => clear("j2")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 20 },
  title: { color: "#c8ff00", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  help: { color: "#888", fontSize: 13, marginBottom: 24, lineHeight: 20 },
  slot: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 16 },
  slotTitle: { color: "#fff", fontWeight: "600", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bound: { color: "#c8ff00" },
  linkDanger: { color: "#f87171" },
  btn: { backgroundColor: "#c8ff00", borderRadius: 10, padding: 14 },
  btnText: { color: "#000", fontWeight: "600", textAlign: "center" },
});
