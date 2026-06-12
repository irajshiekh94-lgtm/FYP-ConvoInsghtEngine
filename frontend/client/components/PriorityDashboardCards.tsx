import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { PrioritiesBucket } from "@/types";

interface PriorityDashboardCardsProps {
  priorities?: PrioritiesBucket;
  counts?: { urgent: number; moderate: number; low: number };
  onPressCard?: (level: keyof PrioritiesBucket) => void;
}

export function PriorityDashboardCards({
  priorities,
  counts,
  onPressCard,
}: PriorityDashboardCardsProps) {
  const { theme } = useTheme();

  const cards = [
    { key: "urgent" as const, label: "Urgent", icon: "alert-circle" as const, color: theme.priorityUrgent },
    { key: "moderate" as const, label: "Moderate", icon: "alert-triangle" as const, color: theme.priorityModerate },
    { key: "low" as const, label: "Low", icon: "check-circle" as const, color: theme.priorityLow },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => {
        const count = counts?.[card.key] ?? priorities?.[card.key]?.length ?? 0;
        const Wrapper = onPressCard ? Pressable : View;

        return (
          <Wrapper
            key={card.key}
            style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
            onPress={onPressCard ? () => onPressCard(card.key) : undefined}
          >
            <View style={[styles.iconWrap, { backgroundColor: card.color + "18" }]}>
              <Feather name={card.icon} size={20} color={card.color} />
            </View>
            <ThemedText type="h3" style={{ color: card.color }}>
              {count}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {card.label}
            </ThemedText>
          </Wrapper>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.sm },
  card: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
});
