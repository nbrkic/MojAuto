import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { formatDateNumericSr } from "@/lib/format";
import { getSerbiaFuelPrices, type FuelPriceKey, type SerbiaFuelPrices } from "@/lib/fuel-prices";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FUEL_PRICE_META: Record<FuelPriceKey, { label: string; icon: IconName }> = {
  gasoline: { label: "Benzin (BMB95)", icon: "gas-station" },
  diesel: { label: "Dizel", icon: "fuel" },
  lpg: { label: "TNG", icon: "propane-tank-outline" },
  cng: { label: "CNG", icon: "gas-cylinder" },
};

export default function FuelPricesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prices, setPrices] = useState<SerbiaFuelPrices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSerbiaFuelPrices().then((result) => {
      setPrices(result);
      setLoading(false);
    });
  }, []);

  const rows = prices?.rows.filter((row) => row.price !== null) ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
          <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Cene goriva</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.section}>
        <View style={styles.marketHeader}>
          <Text style={styles.titleBlock}>Cene goriva u Srbiji</Text>
          <Badge label="Uživo" tone="accent" icon="broadcast" />
        </View>
        <Text style={styles.subtitle}>Prosečne maloprodajne cene, agregirano iz više izvora.</Text>
      </View>

      {loading ? (
        <View style={styles.section}>
          <Skeleton height={180} radius={0} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.section}>
          <Card>
            <Text style={styles.hintText}>Cene trenutno nisu dostupne. Pokušaj ponovo kasnije.</Text>
          </Card>
        </View>
      ) : (
        <View style={styles.section}>
          <Card padded={false} style={styles.marketCard}>
            {rows.map((row, index) => {
              const meta = FUEL_PRICE_META[row.key];
              const trendIcon = !row.change ? null : row.change > 0 ? "trending-up" : "trending-down";
              const trendColor = row.change && row.change > 0 ? Colors.danger : Colors.success;
              return (
                <View key={row.key} style={[styles.marketRow, index < rows.length - 1 && styles.marketRowDivider]}>
                  <View style={styles.marketIconWrap}>
                    <Icon name={meta.icon} size={19} color={Colors.accent} />
                  </View>
                  <Text style={styles.marketLabel}>{meta.label}</Text>
                  {trendIcon && <Icon name={trendIcon} size={16} color={trendColor} style={{ marginRight: 4 }} />}
                  <Text style={styles.marketValue}>{row.price!.toFixed(2)} RSD/L</Text>
                </View>
              );
            })}
          </Card>
          {prices && (
            <Text style={styles.attribution}>
              Izvor: OpenVan.camp · ažurirano {formatDateNumericSr(prices.fetchedAt)}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary, flex: 1, textAlign: "center" },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  marketHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleBlock: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm },
  hintText: { ...Typography.caption, color: Colors.textSecondary },
  attribution: { ...Typography.tag, color: Colors.textTertiary, marginTop: Spacing.sm },
  marketCard: { borderColor: Colors.accentDeep, borderWidth: 1 },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  marketRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  marketIconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentWash,
  },
  marketLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  marketValue: { ...Typography.statMedium, color: Colors.textPrimary },
});
