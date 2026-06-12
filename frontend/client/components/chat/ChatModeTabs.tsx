import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

export type ChatViewMode = "dashboard" | "conversation";

interface ChatModeTabsProps {
  mode: ChatViewMode;
  onModeChange: (mode: ChatViewMode) => void;
}

const MODES: { key: ChatViewMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "dashboard", label: "Dashboard", icon: "grid" },
  { key: "conversation", label: "Conversation", icon: "message-circle" },
];

export function ChatModeTabs({ mode, onModeChange }: ChatModeTabsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.headerBackground }]}>
      <View style={[styles.track, { backgroundColor: theme.backgroundTertiary + "55" }]}>
        {MODES.map((item) => {
          const active = mode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onModeChange(item.key)}
              style={[
                styles.tab,
                active && {
                  backgroundColor: theme.surfaceElevated,
                  ...styles.activeShadow,
                },
              ]}
            >
              <Feather
                name={item.icon}
                size={16}
                color={active ? theme.primary : theme.headerForegroundMuted}
              />
              <ThemedText
                type="small"
                style={{
                  color: active ? theme.primary : theme.headerForegroundMuted,
                  fontWeight: active ? "700" : "500",
                }}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  track: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  activeShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
