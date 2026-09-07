import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { formatDateLongSr } from "@/lib/format";
import { deleteTrip, formatDurationShort, formatTripDistance, getTrip, regionForPoints, type Trip } from "@/lib/trips";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TripDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTrip(tripId)
        .then((data) => {
          if (!active) return;
          setTrip(data);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          showToast(err instanceof Error ? err.message : "Putovanje nije pronađeno", "error");
          router.back();
        });
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]),
  );

  function handleDelete() {
    Alert.alert("Obriši putovanje?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrip(tripId);
            router.back();
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Greška pri brisanju", "error");
          }
        },
      },
    ]);
  }

  const points = trip?.route ?? [];
  const region = regionForPoints(points);
  const durationS = trip?.duration_s ?? 0;
  const distanceM = trip?.distance_m ?? 0;
  const avgSpeedKmh = durationS > 0 ? (distanceM * 3.6) / durationS : 0;

  const readoutItems: ReadoutItem[] = [
    { key: "duration", label: "Trajanje", value: formatDurationShort(durationS), tone: "accent" },
    { key: "distance", label: "Pređeno", value: formatTripDistance(distanceM) },
    { key: "speed", label: "Prosečna brzina", value: `${avgSpeedKmh.toFixed(1).replace(".", ",")} km/h` },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
          <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {trip ? formatDateLongSr(trip.started_at) : "Putovanje"}
        </Text>
        <Pressable onPress={handleDelete} hitSlop={8} style={styles.headerButton}>
          <Icon name="trash-can-outline" size={21} color={Colors.danger} />
        </Pressable>
      </View>

      {loading || !trip ? (
        <View style={styles.section}>
          <Skeleton height={260} radius={0} />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.mapFrame}>
              {region && points.length > 0 ? (
                <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
                  {points.length > 1 && (
                    <Polyline
                      coordinates={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                      strokeColor={Colors.accent}
                      strokeWidth={4}
                    />
                  )}
                  <Marker coordinate={{ latitude: points[0].lat, longitude: points[0].lng }} pinColor={Colors.success} title="Start" />
                  <Marker
                    coordinate={{ latitude: points[points.length - 1].lat, longitude: points[points.length - 1].lng }}
                    pinColor={Colors.danger}
                    title="Kraj"
                  />
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Icon name="map-marker-off-outline" size={22} color={Colors.textTertiary} />
                  <Text style={styles.mapPlaceholderText}>Nema sačuvane rute za ovo putovanje.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <ReadoutStrip items={readoutItems} />
          </View>

          <View style={styles.section}>
            <Button title="Obriši putovanje" variant="danger" onPress={handleDelete} />
          </View>
        </>
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
  mapFrame: {
    height: 260,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  mapPlaceholderText: { ...Typography.caption, color: Colors.textTertiary, textAlign: "center", paddingHorizontal: Spacing.lg },
});
