import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PriorityDashboardCards } from "@/components/PriorityDashboardCards";

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: number;
  label: string;
  color: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <ThemedText type="h3" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

function RecentChatItem({
  chat,
  onPress,
}: {
  chat: { id: string; name: string; category: string; analyzedAt: string };
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.recentItem,
        {
          backgroundColor: pressed
            ? theme.backgroundSecondary
            : theme.backgroundDefault,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.recentItemContent}>
        <ThemedText type="body" style={styles.recentItemName} numberOfLines={1}>
          {chat.name}
        </ThemedText>
        <View style={styles.recentItemMeta}>
          <CategoryBadge category={chat.category} size="small" />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {new Date(chat.analyzedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const screen = useTabScreenInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats } = useChats();
  const { actions } = useActions();

  const pendingActions = actions.filter((a) => !a.completed);
  const urgentItems = actions.filter(
    (a) => !a.completed && a.urgency === "high"
  );

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
    .sort(
      (a, b) =>
        new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
    )
    .slice(0, 5);

  const contentStyle = {
    paddingTop: screen.paddingTop,
    paddingBottom: screen.paddingBottom,
    paddingHorizontal: screen.paddingHorizontal,
    flexGrow: 1,
  };

  if (chats.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[contentStyle, styles.emptyScroll]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "18" }]}>
            <Feather name="message-circle" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.emptyTitle}>
            Welcome to ConvoInsight
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyBody, { color: theme.textSecondary }]}
          >
            Import a WhatsApp export to get priorities, action items, and a chat
            preview in seconds.
          </ThemedText>
          <Pressable
            style={[styles.cta, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("Upload")}
          >
            <Feather name="upload-cloud" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={styles.ctaText}>
              Import your first chat
            </ThemedText>
          </Pressable>
        </ScrollView>
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
        <View style={styles.statsRow}>
          <StatCard
            icon="message-circle"
            value={chats.length}
            label="Chats"
            color={theme.primary}
          />
          <StatCard
            icon="check-square"
            value={pendingActions.length}
            label="Actions"
            color={theme.categoryActionable}
          />
          <StatCard
            icon="alert-circle"
            value={urgentItems.length}
            label="Urgent"
            color={theme.categoryUrgent}
          />
        </View>

        <Card style={styles.overviewCard}>
          <SectionHeader title="Priority overview" />
          <PriorityDashboardCards counts={priorityTotals} />
        </Card>

        {recentChats.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Recent analysis"
              actionLabel="See all"
              onAction={() => navigation.getParent()?.navigate("ChatsTab")}
            />
            <Card style={styles.recentCard}>
              <View style={styles.list}>
                {recentChats.map((chat) => (
                  <RecentChatItem
                    key={chat.id}
                    chat={chat}
                    onPress={() =>
                      navigation.navigate("Dashboard", { chatId: chat.id })
                    }
                  />
                ))}
              </View>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: { marginBottom: 2 },
  section: { marginBottom: Spacing.lg },
  overviewCard: {
    marginBottom: Spacing.lg,
  },
  recentCard: {
    padding: Spacing.md,
  },
  list: { gap: Spacing.sm },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  recentItemContent: { flex: 1 },
  recentItemName: { fontWeight: "600", marginBottom: Spacing.xs },
  recentItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyScroll: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: { textAlign: "center", marginBottom: Spacing.sm },
  emptyBody: { textAlign: "center", marginBottom: Spacing.xl, lineHeight: 22 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  ctaText: { color: "#FFFFFF", fontWeight: "600" },
});
