import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  doc,
  onSnapshot,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../src/firebase/firebaseConfig";
import { useEffect, useState } from "react";

// Distance calculation helper
function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function SOSScreen() {
  const { journeyId } = useLocalSearchParams();
  const [journey, setJourney] = useState<any>(null);
  const [sosSent, setSosSent] = useState(false);
  const [distanceTraveled, setDistanceTraveled] = useState(0);

  // Send SOS
  const sendSOS = async () => {
    if (!journey) return;

    try {
      await addDoc(collection(db, "sos_alerts"), {
        journeyId: journeyId || "demo",
        startPoint: journey.startPoint,
        destination: journey.destination,
        status: "active",
        timestamp: serverTimestamp(),
      });

      setSosSent(true);
      Alert.alert("SOS Sent", "Authorities have been notified");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to send SOS");
    }
  };

  // Listen for real-time updates
  useEffect(() => {
    if (!journeyId) {
      // Hardcoded demo journey for testing
      setJourney({
        startPoint: "Leh",
        destination: "Manali",
        safetyScore: 78,
        altitude: "3200m",
        distance: "0m",
        temperature: "4°C",
        latitude: 34.1526,
        longitude: 77.5770,
        startLatitude: 34.1526,
        startLongitude: 77.5770,
      });
      setDistanceTraveled(0);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "journeys", journeyId as string),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setJourney(data);

          // Calculate distance from start coordinates
          if (
            data.latitude &&
            data.longitude &&
            data.startLatitude &&
            data.startLongitude
          ) {
            const dist = getDistanceFromLatLonInMeters(
              data.startLatitude,
              data.startLongitude,
              data.latitude,
              data.longitude
            );
            setDistanceTraveled(dist);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [journeyId]);

  if (!journey) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#0b1f26", "#0f2e3a", "#0b1f26"]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trail-sign-outline" size={40} color="#fff" />
        <Text style={styles.title}>SafarShield</Text>
      </View>

      {/* Safety Meter */}
      <View style={styles.meterContainer}>
        <View style={styles.arc} />
        <Text style={styles.score}>{journey.safetyScore}</Text>
        <Text style={styles.scoreLabel}>Safety Score</Text>
        <Text style={styles.scoreStatus}>Drive with Caution</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={22} color="#fff" />
          <Text style={styles.statTitle}>Latitude</Text>
          <Text style={styles.statValue}>
            {journey.latitude?.toFixed(5)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={22} color="#fff" />
          <Text style={styles.statTitle}>Longitude</Text>
          <Text style={styles.statValue}>
            {journey.longitude?.toFixed(5)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <MaterialIcons name="speed" size={22} color="#fff" />
          <Text style={styles.statTitle}>Distance</Text>
          <Text style={styles.statValue}>
            {(distanceTraveled / 1000).toFixed(2)} km
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="snow-outline" size={22} color="#fff" />
          <Text style={styles.statTitle}>Temperature</Text>
          <Text style={styles.statValue}>{journey.temperature}</Text>
        </View>
      </View>

      {/* SOS Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={sendSOS}
        disabled={sosSent}
        style={[styles.sosWrapper, { opacity: sosSent ? 0.7 : 1 }]}
      >
        <LinearGradient
          colors={["#ffb347", "#ff9800"]}
          style={styles.sosButton}
        >
          <Text style={styles.sosText}>{sosSent ? "SENT" : "SOS"}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 30, fontWeight: "bold", color: "#fff", marginTop: 10 },

  meterContainer: { alignItems: "center", marginBottom: 40 },
  arc: {
    width: 280,
    height: 140,
    borderTopLeftRadius: 280,
    borderTopRightRadius: 280,
    borderWidth: 16,
    borderBottomWidth: 0,
    borderColor: "#f6a623",
  },
  score: { position: "absolute", top: 50, fontSize: 52, fontWeight: "bold", color: "#fff" },
  scoreLabel: { color: "#f6a623", fontSize: 18, marginTop: 10 },
  scoreStatus: { color: "#fff", fontSize: 16 },

  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 50 },
  statItem: { alignItems: "center" },
  statTitle: { color: "#ccc", marginTop: 6 },
  statValue: { color: "#fff", fontWeight: "bold", marginTop: 2 },

  sosWrapper: { alignItems: "center" },
  sosButton: { width: 150, height: 150, borderRadius: 75, justifyContent: "center", alignItems: "center", elevation: 10 },
  sosText: { color: "#fff", fontSize: 34, fontWeight: "bold" },
});

