import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Message } from "@/types";

interface ChatBubbleProps {
  message: Message;
  isOutgoing?: boolean;
}

export function ChatBubble({ message, isOutgoing = false }: ChatBubbleProps) {
  const { theme } = useTheme();

  const bubbleColor = isOutgoing
    ? theme.chatBubbleSent
    : theme.chatBubbleReceived;

  const timeLabel = (() => {
    try {
      const d = new Date(message.timestamp);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch {
      /* ignore */
    }
    return message.timestamp?.slice(0, 16) || "";
  })();

  return (
    <View
      style={[
        styles.row,
        isOutgoing ? styles.rowOutgoing : styles.rowIncoming,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleColor,
            borderTopLeftRadius: isOutgoing ? BorderRadius.md : BorderRadius.xs,
            borderTopRightRadius: isOutgoing ? BorderRadius.xs : BorderRadius.md,
          },
        ]}
      >
        {!isOutgoing ? (
          <ThemedText
            type="caption"
            style={[styles.sender, { color: theme.primaryVariant }]}
          >
            {message.sender}
          </ThemedText>
        ) : null}
        <ThemedText type="body">{message.content}</ThemedText>
        <ThemedText
          type="caption"
          style={[styles.time, { color: theme.textSecondary }]}
        >
          {timeLabel}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: Spacing.sm,
    maxWidth: "88%",
  },
  rowIncoming: {
    alignSelf: "flex-start",
  },
  rowOutgoing: {
    alignSelf: "flex-end",
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sender: {
    fontWeight: "600",
    marginBottom: 2,
  },
  time: {
    alignSelf: "flex-end",
    marginTop: Spacing.xs,
  },
});
