import { useUrgentNotifications } from "@/hooks/useUrgentNotifications";
import { useChats } from "@/hooks/useChats";
import { useSettings } from "@/hooks/useSettings";

/** Mount once at app root to wire urgent local notifications. */
export function UrgentNotificationsBridge() {
  const { chats } = useChats();
  const { settings } = useSettings();
  useUrgentNotifications(chats, settings.urgentAlertsEnabled);
  return null;
}
