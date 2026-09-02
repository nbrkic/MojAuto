import { LogBox } from "react-native";

/**
 * expo-notifications logs these purely because remote push registration is
 * blocked in Expo Go since SDK 53 — harmless here since MojAuto only
 * schedules local reminders, never remote push. LogBox re-filters already
 * queued logs when patterns are added, so import order doesn't matter.
 */
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go",
  "`expo-notifications` functionality is not fully supported in Expo Go",
]);
