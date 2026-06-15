import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { summaryPeriodLabel } from "@/lib/summarize-chat";
import type { SummaryInsights, TwentyFourHourSummary } from "@/types";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function InsightSection({
  title,
  icon,
  items,
  defaultOpen = false,
  accent,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  items: string[];
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { theme } = useTheme();

  if (!items.length) return null;
  const color = accent || theme.primary;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.section, { borderColor: theme.border }]}>
      <Pressable onPress={toggle} style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Feather name={icon} size={16} color={color} />
          <ThemedText type="small" style={{ fontWeight: "600" }}>
            {title}
          </ThemedText>
          <View style={[styles.countBadge, { backgroundColor: color + "22" }]}>
            <ThemedText type="caption" style={{ color, fontWeight: "700" }}>
              {items.length}
            </ThemedText>
          </View>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {open ? (
        <View style={styles.sectionBody}>
          {items.map((line, i) => (
            <View key={i} style={styles.bulletRow}>
              <ThemedText type="body" style={{ color: theme.primary }}>
                •
              </ThemedText>
              <ThemedText
                type="body"
                style={{ flex: 1, color: theme.textSecondary, lineHeight: 22 }}
              >
                {line}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PanelCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface ExecutiveSummaryPanelProps {
  summary?: TwentyFourHourSummary | null;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
}

export function ExecutiveSummaryPanel({
  summary,
  loading,
  error,
  onRefresh,
}: ExecutiveSummaryPanelProps) {
  const { theme } = useTheme();
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const hasGeneratedSummary = Boolean(summary?.summary?.trim());
  const insights: SummaryInsights | undefined = hasGeneratedSummary
    ? summary?.insights
    : undefined;

  const hasInsightDetails = Boolean(
    insights &&
      (insights.keyDecisions.length ||
        insights.assignedTasks.length ||
        insights.pendingActions.length ||
        insights.blockers.length ||
        insights.peopleMentioned.length)
  );

  const toggleSummary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSummaryOpen((v) => !v);
  };

  const toggleInsights = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInsightsOpen((v) => !v);
  };

  const toggleSpeak = () => {
    if (!hasGeneratedSummary || !summary?.summary?.trim()) return;

    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    Speech.speak(summary.summary.trim(), {
      language: "en",
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <View style={styles.wrap}>
      <PanelCard>
        <View style={styles.cardHeader}>
          <ThemedText type="h4">Summary</ThemedText>
          <View style={styles.headerActions}>
            {hasGeneratedSummary ? (
              <Pressable
                onPress={toggleSpeak}
                style={[styles.iconBtn, { borderColor: theme.primary }]}
                accessibilityLabel={speaking ? "Stop reading summary" : "Listen to summary"}
              >
                <Feather
                  name={speaking ? "square" : "volume-2"}
                  size={16}
                  color={theme.primary}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={onRefresh}
              disabled={loading}
              style={[styles.iconBtn, { borderColor: theme.primary }]}
              accessibilityLabel="Refresh summary"
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="refresh-cw" size={16} color={theme.primary} />
              )}
            </Pressable>
          </View>
        </View>

        {hasGeneratedSummary && summary ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            {summaryPeriodLabel(summary.period)} · {summary.messageCount} message
            {summary.messageCount === 1 ? "" : "s"}
            {insights?.sentiment ? ` · ${insights.sentiment}` : ""}
          </ThemedText>
        ) : null}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.error + "12" }]}>
            <ThemedText type="body" style={{ color: theme.error }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={toggleSummary}
          style={[styles.toggleRow, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
            {summaryOpen ? "Hide" : "Show"} summary
          </ThemedText>
          <Feather
            name={summaryOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>

        {summaryOpen ? (
          hasGeneratedSummary ? (
            <View style={[styles.summaryBox, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="body" style={styles.summaryText} selectable>
                {summary!.summary.trim()}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.emptySummary, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="zap" size={24} color={theme.textSecondary} />
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary, textAlign: "center", lineHeight: 22 }}
              >
                Tap the refresh button or the ⚡ in the header to generate a summary.
              </ThemedText>
            </View>
          )
        ) : null}
      </PanelCard>

      <PanelCard>
        <Pressable onPress={toggleInsights} style={styles.cardHeader}>
          <ThemedText type="h4" style={{ flex: 1 }}>
            Insights & actions
          </ThemedText>
          <Feather
            name={insightsOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {insightsOpen ? (
          hasGeneratedSummary && hasInsightDetails ? (
            <View style={styles.detailsBody}>
              <InsightSection
                title="Key decisions"
                icon="check-circle"
                items={insights?.keyDecisions ?? []}
                accent={theme.categoryActionable}
                defaultOpen
              />
              <InsightSection
                title="Assigned tasks"
                icon="user-check"
                items={insights?.assignedTasks ?? []}
                defaultOpen
              />
              <InsightSection
                title="Pending actions"
                icon="clock"
                items={insights?.pendingActions ?? []}
              />
              <InsightSection
                title="Blockers & risks"
                icon="alert-triangle"
                items={insights?.blockers ?? []}
                accent={theme.priorityUrgent}
              />
              <InsightSection
                title="People mentioned"
                icon="users"
                items={insights?.peopleMentioned ?? []}
              />
            </View>
          ) : (
            <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
              Generate a summary to see decisions, tasks, and action items here.
            </ThemedText>
          )
        ) : null}
      </PanelCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  summaryBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  summaryText: {
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  emptySummary: {
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  detailsBody: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  section: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sectionBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
});
