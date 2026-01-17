import { router } from "expo-router";
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
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../src/firebase/firebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);

      router.replace("/(tabs)/journey");
    } catch (error) {
      setLoading(false);
      Alert.alert("Login Failed", "Invalid email or password");
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

        {/* Email */}
        <View style={styles.inputBox}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#ccc"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
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

        {/* Login Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={loginUser}>
          <LinearGradient
            colors={["#f6a623", "#f39c12"]}
            style={styles.loginBtn}
          >
            <Text style={styles.loginText}>
              {loading ? "Logging in..." : "LOGIN"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.link}>
          Don’t have an account?{" "}
          <Text style={styles.signup} onPress={() => router.push("/signup")}>
            Sign Up
          </Text>
        </Text>
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
  loginBtn: {
    width: 180,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    color: "#ddd",
    marginTop: 14,
  },
  signup: {
    color: "#f6a623",
    fontWeight: "bold",
  },
});
