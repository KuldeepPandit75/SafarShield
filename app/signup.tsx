import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../src/firebase/firebaseConfig";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signupUser = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", res.user.uid), {
        name,
        email,
        role: "user",
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      router.replace("/(tabs)/journey");

    } catch (error) {
      setLoading(false);
      Alert.alert("Signup Failed", "Email already exists or invalid");
    }
  };

  return (
    <LinearGradient
      colors={["#0f2027", "#203a43", "#2c5364"]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Ionicons name="trail-sign-outline" size={52} color="#fff" />
        <Text style={styles.title}>SafarShield</Text>

        {/* Full Name */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#ccc"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <Ionicons name="person-outline" size={20} color="#aaa" />
        </View>

        {/* Email */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#ccc"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <Ionicons name="mail-outline" size={20} color="#aaa" />
        </View>

        {/* Password */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <Ionicons name="lock-closed-outline" size={20} color="#aaa" />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#ccc"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Ionicons name="lock-closed-outline" size={20} color="#aaa" />
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={signupUser}>
          <LinearGradient
            colors={["#f6a623", "#f39c12"]}
            style={styles.signupBtn}
          >
            <Text style={styles.signupText}>
              {loading ? "Creating..." : "SIGN UP"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text style={styles.loginRedirect}>
            Already have an account? <Text style={styles.link}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
    marginVertical: 20,
  },
  inputBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6fd3d3",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  signupBtn: {
    width: 200,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
    alignItems: "center",
  },
  signupText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  terms: {
    color: "#ccc",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  loginRedirect: {
    color: "#ddd",
    marginTop: 18,
  },
  link: {
    color: "#f6a623",
    fontWeight: "bold",
  },
});
