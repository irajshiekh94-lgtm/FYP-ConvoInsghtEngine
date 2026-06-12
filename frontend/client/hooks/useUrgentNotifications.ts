import { useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { countUnreadUrgentMessages } from "@/lib/chat-read-state";
import {
  clearUrgentNotifications,
  ensureNotificationPermissions,
  presentUrgentNotification,
} from "@/lib/urgent-notifications";
import type { Chat } from "@/types";

/**
 * Sends a local push when the app backgrounds and urgent items exist.
 * Disabled entirely when `urgentAlertsEnabled` is false.
 */
export function useUrgentNotifications(
  chats: Chat[],
  urgentAlertsEnabled: boolean
) {
  const totalUrgent = useMemo(() => countUnreadUrgentMessages(chats), [chats]);
  const lastCountRef = useRef(totalUrgent);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    lastCountRef.current = totalUrgent;
  }, [totalUrgent]);

  useEffect(() => {
    if (!urgentAlertsEnabled) {
      void clearUrgentNotifications();
      return;
    }

    void ensureNotificationPermissions();
  }, [urgentAlertsEnabled]);

  useEffect(() => {
    if (!urgentAlertsEnabled) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      const goingBackground =
        prev === "active" && (nextState === "background" || nextState === "inactive");

      if (goingBackground && totalUrgent > 0) {
        void presentUrgentNotification(totalUrgent);
      }
    });

    return () => subscription.remove();
  }, [urgentAlertsEnabled, totalUrgent]);

  /** Call after a new chat is analyzed — notify if urgents appeared. */
  const notifyIfUrgent = async (count?: number) => {
    if (!urgentAlertsEnabled) return;
    const n = count ?? totalUrgent;
    if (n <= 0) return;
    if (n === lastCountRef.current && appStateRef.current === "active") return;
    await presentUrgentNotification(n);
    lastCountRef.current = n;
  };

  return { totalUrgent, notifyIfUrgent };
}
