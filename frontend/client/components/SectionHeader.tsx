import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="h4">{title}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {actionLabel}
          </ThemedText>
          <Feather name="chevron-right" size={16} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
});
