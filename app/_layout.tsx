import { AuthProvider, useAuth } from "@/lib/auth-context";
import { setupNotifications } from "@/notifications/reminders";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="vehicle/[id]" />
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
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
