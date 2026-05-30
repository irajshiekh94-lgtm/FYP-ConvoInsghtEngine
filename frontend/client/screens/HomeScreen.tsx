import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";
import { CategoryBadge } from "@/components/CategoryBadge";

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
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={24} color={color} />
      </View>
      <ThemedText type="h2" style={styles.statValue}>
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
      style={[styles.recentItem, { backgroundColor: theme.backgroundDefault }]}
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

function ReminderItem({
  item,
}: {
  item: { id: string; content: string; dueDate?: string; type: string };
}) {
  const { theme } = useTheme();

  if (!item.dueDate) return null;

  const dueDate = new Date(item.dueDate);

  const isToday = dueDate.toDateString() === new Date().toDateString();

  const isTomorrow =
    dueDate.toDateString() ===
    new Date(Date.now() + 86400000).toDateString();

  const dateLabel = isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : dueDate.toLocaleDateString();

  return (
    <View
      style={[styles.reminderItem, { backgroundColor: theme.backgroundDefault }]}
    >
      <View
        style={[
          styles.reminderDot,
          { backgroundColor: theme.categoryActionable },
        ]}
      />

      <View style={styles.reminderContent}>
        <ThemedText type="small" numberOfLines={2}>
          {item.content}
        </ThemedText>

        <View style={styles.reminderMeta}>
          <Feather name="clock" size={12} color={theme.textSecondary} />

          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {dateLabel}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats } = useChats();
  const { actions } = useActions();

  const pendingActions = actions.filter((a) => !a.completed);
  const urgentItems = actions.filter(
    (a) => !a.completed && a.urgency === "high"
  );
  const upcomingReminders = actions
    .filter((a) => !a.completed && a.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
  const recentChats = [...chats]
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
    .slice(0, 5);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="message-circle" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        Welcome to ConvoInsight
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyDescription, { color: theme.textSecondary }]}
      >
        Import your WhatsApp chat exports to get AI-powered summaries, action
        items, and smart reminders.
      </ThemedText>
      <Pressable
        style={[styles.importButton, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate("ImportChat")}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          Import Your First Chat
        </ThemedText>
      </Pressable>
    </View>
  );

  if (chats.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
            paddingHorizontal: Spacing.lg,
            flexGrow: 1,
          }}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
        >
          {renderEmptyState()}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.statsRow}>
          <StatCard
            icon="message-circle"
            value={chats.length}
            label="Total Chats"
            color={theme.primary}
          />
          <StatCard
            icon="check-square"
            value={pendingActions.length}
            label="Pending"
            color={theme.categoryActionable}
          />
          <StatCard
            icon="alert-circle"
            value={urgentItems.length}
            label="Urgent"
            color={theme.categoryUrgent}
          />
        </View>

        {recentChats.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Recent Analysis
            </ThemedText>
            <View style={styles.recentList}>
              {recentChats.map((chat) => (
                <RecentChatItem
                  key={chat.id}
                  chat={chat}
                  onPress={() =>
                    navigation.navigate("ChatAnalysis", { chatId: chat.id })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {upcomingReminders.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Upcoming Reminders
            </ThemedText>
            <View style={styles.reminderList}>
              {upcomingReminders.map((item) => (
                <ReminderItem key={item.id} item={item} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    marginBottom: 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  recentList: {
    gap: Spacing.sm,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemName: {
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  recentItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reminderList: {
    gap: Spacing.sm,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: Spacing.md,
  },
  reminderContent: {
    flex: 1,
  },
  reminderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
});
