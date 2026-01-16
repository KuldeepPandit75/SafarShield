import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../src/firebase/firebaseConfig";
import { router } from "expo-router";

export default function JourneyScreen() {
  const [startPoint, setStartPoint] = useState("");
  const [destination, setDestination] = useState("");

  const startJourney = async () => {
    if (!startPoint || !destination) {
      Alert.alert("Error", "Please enter both start and destination points");
      return;
    }

    try {
      // Create a new journey in Firestore
      const docRef = await addDoc(collection(db, "journeys"), {
        startPoint,
        destination,
        safetyScore: 0,
        altitude: "0m",
        distance: "0m",
        temperature: "0°C",
        startLatitude: 0,
        startLongitude: 0,
        latitude: 0,
        longitude: 0,
        createdAt: serverTimestamp(),
      });

      // Navigate to SOS screen with journeyId query param
      router.push(`/(tabs)/sos?journeyId=${docRef.id}`);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to start journey");
    }
  };

  return (
    <LinearGradient colors={["#0b1f26", "#0f2e3a", "#0b1f26"]} style={styles.container}>
      <Text style={styles.title}>SafarShield</Text>

      <View style={styles.inputBox}>
        <TextInput
          placeholder="Starting Point"
          placeholderTextColor="#ccc"
          style={styles.input}
          value={startPoint}
          onChangeText={setStartPoint}
        />
        <Ionicons name="location-outline" size={20} color="#aaa" />
      </View>

      <View style={styles.inputBox}>
        <TextInput
          placeholder="Destination"
          placeholderTextColor="#ccc"
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
        />
        <Ionicons name="flag-outline" size={20} color="#aaa" />
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={startJourney}>
        <LinearGradient colors={["#f6a623", "#f39c12"]} style={styles.button}>
          <Text style={styles.buttonText}>Start Journey</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 32, color: "#fff", textAlign: "center", marginBottom: 40, fontWeight: "bold" },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6fd3d3",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  button: { marginTop: 20, paddingVertical: 16, borderRadius: 25, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
