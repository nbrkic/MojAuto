import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Podsetnici za servis",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    console.log("Notifikacije - status dozvole:", status);
  } catch (error) {
    console.log("Notifikacije nisu uspele da se podese:", error);
  }
}

export async function scheduleReminderNotification(
  title: string,
  vehicleName: string,
  dueDate: string,
) {
  const [year, month, day] = dueDate.split("-").map(Number);
  const triggerDate = new Date(year, month - 1, day, 9, 0, 0);

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: `${vehicleName} — dospeva danas`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: "reminders",
    },
  });
}

export function cancelReminderNotification(notificationId: string) {
  return Notifications.cancelScheduledNotificationAsync(notificationId);
}
