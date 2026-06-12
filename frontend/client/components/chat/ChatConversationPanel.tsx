import React, { useMemo } from "react";
import { FlatList, ListRenderItem, StyleSheet, View } from "react-native";

import { ChatBubble } from "@/components/ChatBubble";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Message } from "@/types";

type ConversationItem =
  | { type: "date"; id: string; label: string }
  | { type: "message"; id: string; message: Message };

interface ChatConversationPanelProps {
  messages: Message[];
  currentUser: string;
}

function formatDateLabel(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10) || "Unknown date";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function buildConversationItems(messages: Message[]): ConversationItem[] {
  const sorted = [...messages].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
    return a.timestamp.localeCompare(b.timestamp);
  });

  const items: ConversationItem[] = [];
  let lastDate = "";

  for (const message of sorted) {
    const dateLabel = formatDateLabel(message.timestamp);
    if (dateLabel !== lastDate) {
      lastDate = dateLabel;
      items.push({ type: "date", id: `date-${dateLabel}`, label: dateLabel });
    }
    items.push({ type: "message", id: message.id, message });
  }

  return items;
}

export function ChatConversationPanel({
  messages,
  currentUser,
}: ChatConversationPanelProps) {
  const { theme } = useTheme();

  const items = useMemo(() => buildConversationItems(messages), [messages]);

  const isOutgoing = (sender: string) =>
    sender.trim().toLowerCase() === currentUser.trim().toLowerCase();

  const renderItem: ListRenderItem<ConversationItem> = ({ item }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateRow}>
          <View
            style={[
              styles.datePill,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.label}
            </ThemedText>
          </View>
        </View>
      );
    }

    return (
      <ChatBubble
        message={item.message}
        isOutgoing={isOutgoing(item.message.sender)}
      />
    );
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.list,
        { backgroundColor: theme.chatWallpaper },
        items.length === 0 && styles.listEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.empty}>
          <ThemedText type="h4" style={{ textAlign: "center", marginBottom: Spacing.sm }}>
            No messages
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            This chat has no message history to display.
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  dateRow: {
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  datePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  empty: {
    padding: Spacing["3xl"],
    alignItems: "center",
  },
});
