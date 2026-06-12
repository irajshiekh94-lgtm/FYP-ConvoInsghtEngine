import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Surface } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PriorityDashboardCards } from "@/components/PriorityDashboardCards";

function getCategoryColor(category: string, theme: ReturnType<typeof useTheme>["theme"]) {
  switch (category) {
    case "important": return theme.categoryImportant;
    case "actionable": return theme.categoryActionable;
    case "business": return theme.categoryBusiness;
    default: return theme.categoryGeneral;
  }
}

export default function HomeScreen() {
  const screen = useTabScreenInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats } = useChats();
  const { actions } = useActions();

  const pendingActions = actions.filter((a) => !a.completed);
  const urgentCount = actions.filter((a) => !a.completed && a.urgency === "high").length;

  const priorityTotals = chats.reduce(
    (acc, chat) => {
      const p = chat.extractedData?.priorities;
      if (!p) return acc;
      return {
        urgent: acc.urgent + (p.urgent?.length ?? 0),
        moderate: acc.moderate + (p.moderate?.length ?? 0),
        low: acc.low + (p.low?.length ?? 0),
      };
    },
    { urgent: 0, moderate: 0, low: 0 }
  );

  const recentChats = [...chats]
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
    .slice(0, 4);

  const contentStyle = {
    paddingTop: screen.paddingTop,
    paddingBottom: screen.paddingBottom,
    paddingHorizontal: screen.paddingHorizontal,
    flexGrow: 1,
  };

  if (chats.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState
          icon="bar-chart-2"
          title="Turn chats into insights"
          description="Import a WhatsApp export to uncover priorities, action items, and executive summaries."
          actionLabel="Import chat"
          onAction={() => navigation.navigate("Upload")}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: screen.scrollIndicatorBottom }}
      >
        {/* Hero insight strip */}
        <Surface style={styles.hero} elevated>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: theme.primary + "18" }]}>
              <Feather name="zap" size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="label" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                Today's snapshot
              </ThemedText>
              <ThemedText type="h4">
                {priorityTotals.urgent > 0
                  ? `${priorityTotals.urgent} urgent item${priorityTotals.urgent === 1 ? "" : "s"} across ${chats.length} chats`
                  : `${chats.length} chat${chats.length === 1 ? "" : "s"} analyzed`}
              </ThemedText>
            </View>
          </View>
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <ThemedText type="h3" style={{ color: theme.primary }}>{pendingActions.length}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Tasks</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.quickStat}>
              <ThemedText type="h3" style={{ color: theme.priorityUrgent }}>{urgentCount}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Urgent</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.quickStat}>
              <ThemedText type="h3">{chats.length}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Chats</ThemedText>
            </View>
          </View>
        </Surface>

        <ThemedText type="label" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          Priority breakdown
        </ThemedText>
        <PriorityDashboardCards counts={priorityTotals} />

        {recentChats.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Recent chats</ThemedText>
              <Pressable onPress={() => navigation.getParent()?.navigate("ChatsTab")}>
                <ThemedText type="link" style={{ color: theme.primary }}>See all</ThemedText>
              </Pressable>
            </View>
            <Surface padding="sm" style={{ gap: 0 }}>
              {recentChats.map((chat, i) => (
                <Pressable
                  key={chat.id}
                  style={({ pressed }) => [
                    styles.chatRow,
                    i < recentChats.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.divider,
                    },
                    pressed && { backgroundColor: theme.backgroundDefault },
                  ]}
                  onPress={() => navigation.navigate("Dashboard", { chatId: chat.id })}
                >
                  <Avatar name={chat.name} color={getCategoryColor(chat.category, theme)} size={44} />
                  <View style={styles.chatRowBody}>
                    <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                      {chat.name}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
                      {chat.twentyFourHourSummary?.summary?.trim().slice(0, 60) ||
                        "No summary yet"}
                    </ThemedText>
                  </View>
                  <CategoryBadge category={chat.category} size="small" />
                </Pressable>
              ))}
            </Surface>
          </>
        ) : null}

        <Pressable
          style={[styles.importCta, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("Upload")}
        >
          <Feather name="plus" size={20} color={theme.onPrimary} />
          <ThemedText type="body" style={{ color: theme.onPrimary, fontWeight: "600" }}>
            Import another chat
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { marginBottom: Spacing.xl },
  heroTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.lg },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStats: { flexDirection: "row", alignItems: "center" },
  quickStat: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 32 },
  sectionLabel: { marginBottom: Spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  chatRowBody: { flex: 1, gap: 2 },
  importCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
});
