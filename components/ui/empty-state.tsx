import { Icon, type IconName } from "@/components/ui/icon";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./button";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={26} color={Colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} fullWidth={false} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h3, color: Colors.textPrimary, textAlign: "center" },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  action: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xxl },
});
