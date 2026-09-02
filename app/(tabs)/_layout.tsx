import { CustomTabBar } from "@/components/custom-tab-bar";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Početna" }} />
      <Tabs.Screen name="expenses" options={{ title: "Troškovi" }} />
      <Tabs.Screen name="reminders" options={{ title: "Servis" }} />
      <Tabs.Screen name="documents" options={{ title: "Dokumenti" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
