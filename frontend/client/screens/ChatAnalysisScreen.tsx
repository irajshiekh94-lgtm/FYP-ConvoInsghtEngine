import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStackScreenInsets } from "@/hooks/useTabScreenInsets";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PriorityDashboardCards } from "@/components/PriorityDashboardCards";
import {
  PriorityInsightCard,
  type PriorityLevel,
} from "@/components/PriorityInsightCard";
import { ChatBubble } from "@/components/ChatBubble";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import {
  ActionItem,
  BusinessOrder,
  Meeting,
  ImportantMessage,
  Message,
  PriorityInsight,
  PrioritiesBucket,
} from "@/types";
import { EMPTY_PRIORITIES } from "@/lib/transform-analysis";

type DashboardRouteProp = RouteProp<
  RootStackParamList,
  "Dashboard" | "ChatAnalysis"
>;

function BulletList({ items }: { items: string[] }) {
  const { theme } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: Spacing.sm }}>
      {items.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <ThemedText type="body" style={{ color: theme.primary }}>
            •
          </ThemedText>
          <ThemedText type="body" style={{ flex: 1, color: theme.textSecondary }}>
            {line}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function CollapsibleSection({
  title,
  icon,
  accentColor,
  children,
  count,
  defaultExpanded = true,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  accentColor?: string;
  children: React.ReactNode;
  count: number;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { theme } = useTheme();

  if (count === 0) return null;

  const badgeColor = accentColor || theme.primary;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Feather name={icon} size={20} color={badgeColor} />
          <ThemedText type="h4">{title}</ThemedText>
          <View style={[styles.countBadge, { backgroundColor: badgeColor }]}>
            <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
              {count}
            </ThemedText>
          </View>
        </View>
        <Feather
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      {isExpanded ? <View style={styles.sectionContent}>{children}</View> : null}
    </View>
  );
}

function PrioritySection({
  title,
  level,
  items,
  icon,
  color,
}: {
  title: string;
  level: PriorityLevel;
  items: PriorityInsight[];
  icon: keyof typeof Feather.glyphMap;
  color: string;
}) {
  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      accentColor={color}
      count={items.length}
    >
      {items.map((item, index) => (
        <PriorityInsightCard key={`${level}-${index}`} item={item} level={level} />
      ))}
    </CollapsibleSection>
  );
}

function ActionItemCard({ item }: { item: ActionItem }) {
  const { theme } = useTheme();

  const getUrgencyColor = () => {
    switch (item.urgency) {
      case "high":
        return "#D32F2F";
      case "medium":
        return "#F9A825";
      default:
        return "#43A047";
    }
  };

  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderLeftColor: getUrgencyColor(),
        },
      ]}
    >
      <ThemedText type="body">{item.content}</ThemedText>
      <View style={styles.itemMeta}>
        <View
          style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor() }]}
        >
          <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
            {item.urgency}
          </ThemedText>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {item.type}
        </ThemedText>
      </View>
    </View>
  );
}

function BusinessOrderCard({ order }: { order: BusinessOrder }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderLeftColor: theme.categoryBusiness,
        },
      ]}
    >
      <ThemedText type="body" style={{ fontWeight: "600" }}>
        {order.product}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {order.customerName} · Qty {order.quantity}
      </ThemedText>
    </View>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderLeftColor: theme.primary,
        },
      ]}
    >
      <ThemedText type="body" style={{ fontWeight: "600" }}>
        {meeting.title}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {meeting.participants.join(", ")}
      </ThemedText>
    </View>
  );
}

function ImportantMessageCard({ message }: { message: ImportantMessage }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.messageCard,
        { backgroundColor: theme.chatBubbleReceived },
      ]}
    >
      <ThemedText type="small" style={{ fontWeight: "600" }}>
        {message.sender}
      </ThemedText>
      <ThemedText type="body">{message.content}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.categoryActionable }}>
        {message.reason}
      </ThemedText>
    </View>
  );
}

export default function ChatAnalysisScreen() {
  const screen = useStackScreenInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<DashboardRouteProp>();
  const { theme } = useTheme();
  const { getChatById } = useChats();
  const [currentUser, setCurrentUser] = useState("Me");
  const [previewExpanded, setPreviewExpanded] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("@ConvoInsight_whatsAppName").then((name) => {
      if (name) setCurrentUser(name);
    });
  }, []);

  const chat = getChatById(route.params.chatId);

  if (!chat) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
          Chat not found
        </ThemedText>
      </ThemedView>
    );
  }

  const {
    actionItems,
    businessOrders,
    meetings,
    importantMessages,
    priorities = EMPTY_PRIORITIES,
    conversationSummary,
  } = chat.extractedData;

  const themes = conversationSummary?.themes ?? [];
  const keyDecisions = conversationSummary?.key_decisions ?? [];

  const isOutgoing = (sender: string) =>
    sender.trim().toLowerCase() === currentUser.trim().toLowerCase();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: screen.paddingTop,
          paddingBottom: screen.paddingBottom,
          paddingHorizontal: screen.paddingHorizontal,
        }}
        scrollIndicatorInsets={{ bottom: screen.scrollIndicatorBottom }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText type="h3" style={{ flex: 1 }}>
              {chat.name}
            </ThemedText>
            <CategoryBadge category={chat.category} />
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Analyzed {new Date(chat.analyzedAt).toLocaleString()}
          </ThemedText>
        </View>

        <PriorityDashboardCards priorities={priorities as PrioritiesBucket} />

        {chat.summary ? (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Feather name="zap" size={20} color={theme.primary} />
              <ThemedText type="h4">Overview</ThemedText>
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {chat.summary}
            </ThemedText>
          </View>
        ) : null}

        {themes.length > 0 ? (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Feather name="layers" size={20} color={theme.primary} />
              <ThemedText type="h4">Conversation themes</ThemedText>
            </View>
            <BulletList items={themes} />
          </View>
        ) : null}

        {keyDecisions.length > 0 ? (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Feather name="check-circle" size={20} color={theme.categoryActionable} />
              <ThemedText type="h4">Key decisions</ThemedText>
            </View>
            <BulletList items={keyDecisions} />
          </View>
        ) : null}

        <PrioritySection
          title="Urgent"
          level="urgent"
          items={priorities.urgent}
          icon="alert-circle"
          color="#D32F2F"
        />
        <PrioritySection
          title="Moderate"
          level="moderate"
          items={priorities.moderate}
          icon="alert-triangle"
          color="#F9A825"
        />
        <PrioritySection
          title="Low priority"
          level="low"
          items={priorities.low}
          icon="check-circle"
          color="#43A047"
        />

        <CollapsibleSection
          title="Action items"
          icon="check-square"
          accentColor={theme.primary}
          count={actionItems.length}
        >
          {actionItems.map((item, index) => (
            <ActionItemCard key={item.id || index} item={item as ActionItem} />
          ))}
        </CollapsibleSection>

        {chat.messages.length > 0 ? (
          <View style={styles.section}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => setPreviewExpanded(!previewExpanded)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Feather name="message-circle" size={20} color={theme.primary} />
                <ThemedText type="h4">Chat preview</ThemedText>
                <View
                  style={[styles.countBadge, { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
                    {Math.min(chat.messages.length, 50)}
                  </ThemedText>
                </View>
              </View>
              <Feather
                name={previewExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            {previewExpanded ? (
              <View
                style={[
                  styles.chatPreview,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                {chat.messages.slice(0, 50).map((msg: Message) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOutgoing={isOutgoing(msg.sender)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <CollapsibleSection
          title="Business orders"
          icon="briefcase"
          count={businessOrders.length}
          defaultExpanded={false}
        >
          {businessOrders.map((order, index) => (
            <BusinessOrderCard key={index} order={order} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Meetings"
          icon="calendar"
          count={meetings.length}
          defaultExpanded={false}
        >
          {meetings.map((meeting, index) => (
            <MeetingCard key={index} meeting={meeting} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Important messages"
          icon="star"
          count={importantMessages.length}
          defaultExpanded={false}
        >
          {importantMessages.map((message, index) => (
            <ImportantMessageCard key={index} message={message} />
          ))}
        </CollapsibleSection>

        <Pressable
          style={[styles.doneButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            View all chats
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  sectionContent: {
    gap: Spacing.xs,
  },
  chatPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 120,
  },
  itemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  messageCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  doneButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
});
