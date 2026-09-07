import { CustomTabBar } from "@/components/custom-tab-bar";
import { Colors } from "@/constants/theme";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Početna" }} />
      <Tabs.Screen name="expenses" options={{ title: "Troškovi" }} />
      <Tabs.Screen name="reminders" options={{ title: "Obaveze" }} />
      <Tabs.Screen name="ai-assistant" options={{ title: "AI" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
