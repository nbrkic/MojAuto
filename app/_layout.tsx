import { ToastProvider } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import "@/lib/dev-warnings";
import { setupNotifications } from "@/notifications/reminders";
import {
  BigShouldersDisplay_600SemiBold,
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_800ExtraBold,
} from "@expo-google-fonts/big-shoulders-display";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from "@expo-google-fonts/work-sans";
import { ThemeProvider, type Theme } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.backgroundElevated,
    text: Colors.textPrimary,
    border: Colors.line,
    notification: Colors.danger,
  },
  fonts: {
    regular: { fontFamily: "WorkSans_400Regular", fontWeight: "400" },
    medium: { fontFamily: "WorkSans_500Medium", fontWeight: "500" },
    bold: { fontFamily: "BigShouldersDisplay_700Bold", fontWeight: "700" },
    heavy: { fontFamily: "BigShouldersDisplay_800ExtraBold", fontWeight: "800" },
  },
};

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="vehicle/[id]" />
          <Stack.Screen name="stats" />
          <Stack.Screen name="add-vehicle" options={{ presentation: "modal" }} />
          <Stack.Screen name="add-expense" options={{ presentation: "modal" }} />
          <Stack.Screen name="add-reminder" options={{ presentation: "modal" }} />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    BigShouldersDisplay_600SemiBold,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    setupNotifications();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <RootNavigator />
      </ToastProvider>
    </AuthProvider>
  );
}
