import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { countUnreadUrgentMessages } from "@/lib/chat-read-state";
import type { Chat } from "@/types";

const URGENT_NOTIFICATION_ID = "urgent-messages-summary";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** @deprecated use countUnreadUrgentMessages */
export function countUrgentMessages(chats: Chat[]): number {
  return countUnreadUrgentMessages(chats);
}

export function urgentNotificationBody(count: number): string {
  if (count <= 0) return "";
  return count === 1
    ? "You have 1 urgent message"
    : `You have ${count} urgent messages`;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function clearUrgentNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(URGENT_NOTIFICATION_ID);
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* ignore */
  }
}

export async function presentUrgentNotification(count: number): Promise<void> {
  if (Platform.OS === "web" || count <= 0) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const body = urgentNotificationBody(count);
  if (!body) return;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: URGENT_NOTIFICATION_ID,
      content: {
        title: "ConvoInsight",
        body,
        sound: true,
        data: { type: "urgent-summary", count },
      },
      trigger: null,
    });
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.warn("Failed to show urgent notification:", error);
  }
}
