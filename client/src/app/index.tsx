import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const API_BASE = "http://192.168.31.32:3001";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [bagId, setBagId] = useState("");
  const [weight, setWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission().catch(() => setError("Unable to request camera permission."));
    }
  }, [permission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setBagId(data);
    setError("");
  };

  const resetScanner = () => {
    setScanned(false);
    setBagId("");
    setWeight("");
    setError("");
  };

  const submitCollection = async () => {
    setError("");
    const numericWeight = Number(weight);

    if (!bagId) { setError("Please scan a bag QR code first."); return; }
    if (!weight || Number.isNaN(numericWeight) || numericWeight <= 0) {
      setError("Please enter a valid waste weight."); return;
    }

    setSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const payload = {
        qr_id: bagId,
        weight: numericWeight,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.status === 409) {
        const body = await response.json();
        setError(body.error ?? "This bag has already been processed.");
        return;
      }

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const result = await response.json();
      Alert.alert(
        "Collection Recorded",
        `Bag ${bagId} — ${numericWeight} kg — ${result.points} pts`,
        [{ text: "OK", onPress: resetScanner }]
      );
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setError("No response from server. Your scan and weight are saved — tap Submit to retry.");
      } else if (err?.message?.includes("Network") || err?.message?.includes("fetch")) {
        setError("No internet connection. Your scan and weight are saved — tap Submit to retry.");
      } else {
        setError("Submission failed. Your scan and weight are saved — tap Submit to retry.");
      }
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Checking camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.message}>Camera permission is required to scan the waste bag QR code.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={() => { setError(""); requestPermission().catch(() => setError("Unable to request camera permission.")); }}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Waste Collection</Text>

      {!scanned ? (
        <>
          <Text style={styles.instruction}>Point the camera at the bag's QR code.</Text>
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.scanOverlay}>
              <View style={styles.scanBox} />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Bag ID</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{bagId}</Text>
          </View>

          <Text style={styles.label}>Waste Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="e.g. 12.5"
            editable={!submitting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={submitCollection}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.buttonText}>Submitting...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Submit Collection</Text>
            )}
          </TouchableOpacity>

          {!submitting && (
            <TouchableOpacity style={styles.secondaryButton} onPress={resetScanner}>
              <Text style={styles.secondaryButtonText}>✕ Discard & Scan Another Bag</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "700", paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  instruction: { paddingHorizontal: 20, marginTop: 8, marginBottom: 16, color: "#555" },
  message: { color: "#555", textAlign: "center", marginBottom: 20, lineHeight: 22 },
  statusText: { marginTop: 12, color: "#555" },
  cameraContainer: { flex: 1, marginHorizontal: 20, marginBottom: 20, overflow: "hidden", borderRadius: 16, backgroundColor: "#111" },
  scanOverlay: { alignItems: "center", justifyContent: "center" },
  scanBox: { width: 240, height: 240, borderWidth: 3, borderColor: "#00ff88", borderRadius: 16 },
  form: { padding: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  readOnlyField: { backgroundColor: "#f1f1f1", borderRadius: 10, padding: 15 },
  readOnlyText: { fontSize: 16, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14, fontSize: 18 },
  button: { backgroundColor: "#16834b", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  secondaryButton: { padding: 16, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { color: "#16834b", fontSize: 16, fontWeight: "600" },
  error: { color: "#c62828", marginTop: 12, lineHeight: 20 },
});
