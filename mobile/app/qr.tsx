import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { parsePartidoIdFromQr } from "../../lib/mobile/parsePartidoQr";

export default function QrScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Necesitamos acceso a la cámara para escanear QR</Text>
        <Text style={styles.link} onPress={requestPermission}>
          Permitir cámara
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                const partidoId = parsePartidoIdFromQr(data);
                if (!partidoId) {
                  setScanned(false);
                  return;
                }
                router.replace(`/partido/${partidoId}`);
              }
        }
      />
      <Text style={styles.hint}>Apunta al QR del partido</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  text: { color: "#fff", textAlign: "center", padding: 24 },
  link: { color: "#c8ff00", marginTop: 16 },
  hint: {
    position: "absolute",
    bottom: 48,
    color: "#fff",
    backgroundColor: "#0008",
    padding: 12,
    borderRadius: 8,
  },
});
