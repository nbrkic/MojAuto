import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { StyleSheet, Switch, Text, View } from "react-native";

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function SwitchRow({ label, description, value, onChange }: SwitchRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.surfaceRaised, true: Colors.accent }}
        thumbColor={Colors.textPrimary}
        ios_backgroundColor={Colors.surfaceRaised}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    marginBottom: Spacing.lg,
  },
  textCol: { flex: 1 },
  label: { ...Typography.body, color: Colors.textPrimary },
  description: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});
