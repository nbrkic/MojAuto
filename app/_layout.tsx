import { setupNotifications } from "@/notifications/reminders";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { migrateDbIfNeeded } from "@/db/migrations";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="mojauto-v2.db" onInit={migrateDbIfNeeded}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-vehicle"
            options={{ presentation: "modal", title: "Dodaj vozilo" }}
          />
          <Stack.Screen
            name="add-expense"
            options={{ presentation: "modal", title: "Dodaj trošak" }}
          />
          <Stack.Screen
            name="add-reminder"
            options={{ presentation: "modal", title: "Dodaj podsetnik" }}
          />
        </Stack>
      </SQLiteProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
