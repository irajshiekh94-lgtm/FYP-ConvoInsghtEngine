import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { PrioritiesBucket } from "@/types";

const CARDS = [
  {
    key: "urgent" as const,
    label: "Urgent",
    icon: "alert-circle" as const,
    color: "#D32F2F",
  },
  {
    key: "moderate" as const,
    label: "Moderate",
    icon: "alert-triangle" as const,
    color: "#F9A825",
  },
  {
    key: "low" as const,
    label: "Low",
    icon: "check-circle" as const,
    color: "#43A047",
  },
];

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

  return (
    <View style={styles.row}>
      {CARDS.map((card) => {
        const count =
          counts?.[card.key] ?? priorities?.[card.key]?.length ?? 0;
        const Wrapper = onPressCard ? Pressable : View;

        return (
          <Wrapper
            key={card.key}
            style={[
              styles.card,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={onPressCard ? () => onPressCard(card.key) : undefined}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: card.color + "22" }]}
            >
              <Feather name={card.icon} size={22} color={card.color} />
            </View>
            <ThemedText type="h2" style={{ color: card.color }}>
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
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  card: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
});
