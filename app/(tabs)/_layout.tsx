import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#f6a623",
        tabBarInactiveTintColor: "#fff",
        tabBarStyle: { backgroundColor: "#0b1f26" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ color }) => (
            <Ionicons name="map-outline" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ color }) => (
            <Ionicons name="alert-circle-outline" size={24} color="red" />
          ),
        }}
      />
    </Tabs>
  );
}
