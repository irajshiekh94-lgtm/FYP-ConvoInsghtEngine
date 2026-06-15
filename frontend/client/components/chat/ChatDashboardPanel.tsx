import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ExecutiveSummaryPanel } from "@/components/chat/ExecutiveSummaryPanel";
import {
  PriorityInsightCard,
  type PriorityLevel,
} from "@/components/PriorityInsightCard";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { Chat, PrioritiesBucket, TwentyFourHourSummary } from "@/types";
import { EMPTY_PRIORITIES } from "@/lib/transform-analysis";

type PriorityTab = "High" | "Moderate" | "Low";

const TAB_TO_LEVEL: Record<PriorityTab, PriorityLevel> = {
  High: "urgent",
  Moderate: "moderate",
  Low: "low",
};

interface ChatDashboardPanelProps {
  chat: Chat;
  summary?: TwentyFourHourSummary | null;
  summaryLoading: boolean;
  summaryError?: string;
  onRefreshSummary: () => void;
}

export function ChatDashboardPanel({
  chat,
  summary,
  summaryLoading,
  summaryError,
  onRefreshSummary,
}: ChatDashboardPanelProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<PriorityTab>("High");

  const priorities: PrioritiesBucket =
    chat.extractedData?.priorities ?? EMPTY_PRIORITIES;
  const level = TAB_TO_LEVEL[activeTab];
  const priorityItems = priorities[level] ?? [];

  const tabCounts = {
    High: priorities.urgent.length,
    Moderate: priorities.moderate.length,
    Low: priorities.low.length,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundDefault }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <ExecutiveSummaryPanel
        summary={summary ?? chat.twentyFourHourSummary}
        loading={summaryLoading}
        error={summaryError}
        onRefresh={onRefreshSummary}
      />

      <View
        style={[
          styles.prioritySection,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        ]}
      >
        <ThemedText type="h4" style={styles.priorityTitle}>
          Priority insights
        </ThemedText>

        <View style={[styles.priorityTabs, { backgroundColor: theme.backgroundDefault }]}>
          {(["High", "Moderate", "Low"] as PriorityTab[]).map((tab) => {
            const active = activeTab === tab;
            const color =
              tab === "High"
                ? theme.priorityUrgent
                : tab === "Moderate"
                  ? theme.priorityModerate
                  : theme.priorityLow;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.priorityTab,
                  active && { backgroundColor: color + "18", borderColor: color },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: active ? color : theme.textSecondary,
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {tab} ({tabCounts[tab]})
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {priorityItems.length > 0 ? (
          <View style={styles.priorityList}>
            {priorityItems.map((item, index) => (
              <PriorityInsightCard key={`${level}-${index}`} item={item} level={level} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyPriority, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={28} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
              No {activeTab.toLowerCase()} priority items in this chat.
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  prioritySection: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  priorityTitle: {
    marginBottom: Spacing.xs,
  },
  priorityTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  priorityTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  priorityList: {
    gap: Spacing.sm,
  },
  emptyPriority: {
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
  },
});
