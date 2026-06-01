import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { PriorityInsight } from "@/types";

export type PriorityLevel = "urgent" | "moderate" | "low";

const LEVEL_COLORS: Record<PriorityLevel, string> = {
  urgent: "#D32F2F",
  moderate: "#F9A825",
  low: "#43A047",
};

const LEVEL_LABELS: Record<PriorityLevel, string> = {
  urgent: "Urgent",
  moderate: "Moderate",
  low: "Low priority",
};

interface PriorityInsightCardProps {
  item: PriorityInsight;
  level: PriorityLevel;
}

export function PriorityInsightCard({ item, level }: PriorityInsightCardProps) {
  const accent = LEVEL_COLORS[level];

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: accent, backgroundColor: accent + "12" },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {item.sender}
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
            {LEVEL_LABELS[level]}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" style={styles.text}>
        {item.text}
      </ThemedText>
      {item.intent ? (
        <ThemedText type="caption" style={styles.intent}>
          {item.intent}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  text: {
    lineHeight: 20,
  },
  intent: {
    marginTop: Spacing.xs,
    opacity: 0.7,
    textTransform: "capitalize",
  },
});
