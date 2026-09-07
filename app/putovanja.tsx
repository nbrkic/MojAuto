import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ReadoutStrip, type ReadoutItem } from "@/components/ui/readout-strip";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { formatDateNumericSr } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import {
  deleteTrip,
  formatDurationShort,
  formatTripDistance,
  getActiveTrip,
  getActiveTripPoints,
  listTrips,
  startTrip,
  stopTrip,
  totalDistance,
  type ActiveTrip,
  type Trip,
  type TripPoint,
} from "@/lib/trips";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import MapView, { Polyline } from "react-native-maps";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = { id: number; make: string; model: string; archived: boolean };

export default function PutovanjaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null | undefined>(undefined);
  const [activePoints, setActivePoints] = useState<TripPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("vehicles")
        .select("id, make, model, archived")
        .order("id", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            showToast(error.message, "error");
            setVehiclesLoaded(true);
            return;
          }
          const list = data ?? [];
          setVehicles(list);
          if (vehicleId === null) {
            const selectable = list.filter((v) => !v.archived);
            if (selectable.length > 0) setVehicleId(selectable[0].id);
          }
          setVehiclesLoaded(true);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showToast]),
  );

  useFocusEffect(
    useCallback(() => {
      getActiveTrip().then((active) => {
        setActiveTrip(active);
        if (active) {
          setVehicleId(active.vehicleId);
          getActiveTripPoints().then(setActivePoints);
        }
      });
    }, []),
  );

  useEffect(() => {
    if (!activeTrip) return;
    const tick = () =>
      setElapsedSeconds(Math.floor((Date.now() - new Date(activeTrip.startedAt).getTime()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  useEffect(() => {
    if (!activeTrip) return;
    const interval = setInterval(() => {
      getActiveTripPoints().then(setActivePoints);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  const loadTrips = useCallback(
    (id: number) => {
      setTripsLoading(true);
      listTrips(id)
        .then((list) => {
          setTrips(list);
          setTripsLoading(false);
        })
        .catch((err) => {
          showToast(err instanceof Error ? err.message : "Greška pri učitavanju putovanja", "error");
          setTripsLoading(false);
        });
    },
    [showToast],
  );

  useFocusEffect(
    useCallback(() => {
      if (vehicleId === null || activeTrip) return;
      loadTrips(vehicleId);
    }, [vehicleId, activeTrip, loadTrips]),
  );

  async function handleStart() {
    if (vehicleId === null || starting) return;
    setStarting(true);
    try {
      const result = await startTrip(vehicleId);
      if (!result.ok) {
        const messages = {
          foreground_denied: "Dozvoli pristup lokaciji da bi pokrenuo putovanje.",
          background_denied:
            "Dozvoli lokaciju 'Uvek' u podešavanjima telefona da bi praćenje radilo i kad je ekran zaključan.",
          services_disabled: "Uključi lokaciju (GPS) na telefonu da bi pokrenuo putovanje.",
        };
        showToast(messages[result.error], "error");
        return;
      }
      setActiveTrip({ tripId: result.tripId, vehicleId, startedAt: new Date().toISOString() });
      setActivePoints([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Greška pri pokretanju putovanja", "error");
    } finally {
      setStarting(false);
    }
  }

  function handleStop() {
    Alert.alert("Završi putovanje?", "Praćenje rute će se zaustaviti i putovanje će biti sačuvano.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Završi",
        style: "destructive",
        onPress: async () => {
          setStopping(true);
          try {
            const trip = await stopTrip();
            setActiveTrip(null);
            setActivePoints([]);
            showToast("Putovanje sačuvano");
            router.push(`/trip/${trip.id}`);
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Greška pri završavanju putovanja", "error");
          } finally {
            setStopping(false);
          }
        },
      },
    ]);
  }

  function handleDeleteTrip(trip: Trip) {
    Alert.alert("Obriši putovanje?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrip(trip.id);
            setTrips((prev) => prev.filter((t) => t.id !== trip.id));
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Greška pri brisanju putovanja", "error");
          }
        },
      },
    ]);
  }

  const vehicleOptions = vehicles
    .filter((v) => !v.archived)
    .map((v) => ({ value: v.id, label: `${v.make} ${v.model}` }));
  const activeVehicle = activeTrip ? vehicles.find((v) => v.id === activeTrip.vehicleId) : null;
  const liveDistance = totalDistance(activePoints);
  const lastPoint = activePoints[activePoints.length - 1];

  const activeReadout: ReadoutItem[] = [
    { key: "duration", label: "Trajanje", value: formatDurationShort(elapsedSeconds), tone: "accent" },
    { key: "distance", label: "Pređeno", value: formatTripDistance(liveDistance) },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Icon name="chevron-left" size={26} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Putovanja</Text>
          <View style={styles.headerButton} />
        </View>

        {!vehiclesLoaded ? (
          <View style={styles.section}>
            <Skeleton height={54} radius={3} />
          </View>
        ) : vehicleOptions.length === 0 ? (
          <EmptyState
            icon="car-side"
            title="Nema vozila"
            subtitle="Dodaj vozilo da bi mogao da pratiš putovanja."
            actionLabel="+ Dodaj vozilo"
            onAction={() => router.push("/add-vehicle")}
          />
        ) : activeTrip ? (
          <>
            <View style={styles.section}>
              <Text style={styles.activeVehicleText}>
                {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : ""}
              </Text>
              <View style={styles.mapFrame}>
                {lastPoint ? (
                  <MapView
                    style={StyleSheet.absoluteFill}
                    region={{
                      latitude: lastPoint.lat,
                      longitude: lastPoint.lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    {activePoints.length > 1 && (
                      <Polyline
                        coordinates={activePoints.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                        strokeColor={Colors.accent}
                        strokeWidth={4}
                      />
                    )}
                  </MapView>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Icon name="crosshairs-gps" size={22} color={Colors.textTertiary} />
                    <Text style={styles.mapPlaceholderText}>Čekam GPS signal...</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <ReadoutStrip items={activeReadout} />
            </View>

            <View style={styles.section}>
              <Button title="Završi putovanje" variant="danger" onPress={handleStop} loading={stopping} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <SelectField
                placeholder="Izaberi vozilo"
                value={vehicleId}
                options={vehicleOptions}
                onChange={setVehicleId}
                sheetTitle="Izaberi vozilo"
              />
              <Button
                title="Pokreni putovanje"
                icon="play"
                onPress={handleStart}
                loading={starting}
                style={{ marginTop: Spacing.sm }}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Istorija</Text>
              {tripsLoading ? (
                <Skeleton height={120} radius={0} />
              ) : trips.length === 0 ? (
                <Card>
                  <Text style={styles.emptyText}>Još nema sačuvanih putovanja za ovo vozilo.</Text>
                </Card>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  {trips.map((trip) => (
                    <Card key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)} style={styles.row}>
                      <View style={styles.rowIcon}>
                        <Icon name="map-marker-path" size={20} color={Colors.accent} />
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {formatDateNumericSr(trip.started_at)}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {formatDurationShort(trip.duration_s ?? 0)} · {formatTripDistance(trip.distance_m ?? 0)}
                        </Text>
                      </View>
                      <Pressable onPress={() => handleDeleteTrip(trip)} hitSlop={8} style={styles.rowDelete}>
                        <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                      </Pressable>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.md },
  activeVehicleText: { ...Typography.eyebrow, color: Colors.textSecondary, marginBottom: Spacing.sm },
  mapFrame: {
    height: 260,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  mapPlaceholderText: { ...Typography.caption, color: Colors.textTertiary },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  rowIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  rowDelete: { marginLeft: Spacing.sm, padding: 4 },
});
