import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Spacing, Typography } from "@/constants/theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROUTE_META: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: "Početna", icon: "view-dashboard-outline", activeIcon: "view-dashboard" },
  expenses: { label: "Troškovi", icon: "credit-card-outline", activeIcon: "credit-card" },
  reminders: { label: "Obaveze", icon: "clipboard-check-outline", activeIcon: "clipboard-check" },
  documents: { label: "Dokumenti", icon: "folder-outline", activeIcon: "folder" },
  profile: { label: "Profil", icon: "account-circle-outline", activeIcon: "account-circle" },
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
      {state.routes.map((route, index) => {
        const meta = ROUTE_META[route.name] ?? {
          label: route.name,
          icon: "circle-outline" as IconName,
          activeIcon: "circle" as IconName,
        };
        const focused = state.index === index;
        const color = focused ? Colors.accent : Colors.textTertiary;

        const onPress = () => {
          if (process.env.EXPO_OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <Icon name={focused ? meta.activeIcon : meta.icon} size={21} color={color} />
            <Text style={[styles.label, { color }]}>{meta.label}</Text>
            <View style={[styles.mark, focused && styles.markActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.lineStrong,
    paddingTop: Spacing.md,
  },
  tab: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 2 },
  label: { ...Typography.tag },
  mark: { width: 14, height: 2, marginTop: 2, backgroundColor: "transparent" },
  markActive: { backgroundColor: Colors.accent },
});
