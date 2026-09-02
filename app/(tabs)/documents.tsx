import { EmptyState } from "@/components/ui/empty-state";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dokumenti</Text>
      </View>
      <View style={styles.body}>
        <EmptyState
          icon="file-cabinet"
          title="Uskoro dostupno"
          subtitle={
            "Digitalna garaža za saobraćajnu, polisu osiguranja, servisne fakture i druge dokumente stiže u sledećoj nadogradnji."
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.textPrimary },
  body: { flex: 1, justifyContent: "center" },
});
