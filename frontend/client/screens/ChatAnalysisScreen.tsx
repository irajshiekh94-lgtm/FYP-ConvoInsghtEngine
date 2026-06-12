import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
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
import { Card } from "@/components/Card";
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
import { summarizeChat24h } from "@/lib/api-client";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/Button";
import {
  ActionItem,
  BusinessOrder,
  Meeting,
  ImportantMessage,
  Message,
  PriorityInsight,
  PrioritiesBucket,
  EntityInsight,
  TopicInsight,
  AnalyticsInsight,
  MetadataInsight,
  SentimentInsight,
  TwentyFourHourSummary,
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

function StatGrid({ analytics }: { analytics: AnalyticsInsight }) {
  const { theme } = useTheme();
  const stats = [
    ["Messages", analytics.total_messages],
    ["Participants", analytics.total_participants],
    ["Topics", analytics.topic_count],
    ["Entities", analytics.entity_count],
    ["Actions", analytics.action_count],
    ["Urgent", analytics.urgent_count],
  ];

  return (
    <View style={styles.statGrid}>
      {stats.map(([label, value]) => (
        <View
          key={String(label)}
          style={[styles.statTile, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="h4">{value}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function SentimentCard({ sentiment }: { sentiment: SentimentInsight }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Feather name="activity" size={20} color={theme.primary} />
        <ThemedText type="h4">Sentiment</ThemedText>
      </View>
      <ThemedText type="body" style={{ textTransform: "capitalize" }}>
        {sentiment.label} ({sentiment.score})
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        Positive {sentiment.positive_count} · Negative {sentiment.negative_count} · Neutral {sentiment.neutral_count}
      </ThemedText>
    </Card>
  );
}

function TopicCard({ topic }: { topic: TopicInsight }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.itemCard,
        { backgroundColor: theme.backgroundDefault, borderLeftColor: theme.primary },
      ]}
    >
      <ThemedText type="body" style={{ fontWeight: "600" }}>
        {topic.title}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {topic.message_count} messages · {topic.senders.join(", ")}
      </ThemedText>
      {topic.keywords.length > 0 ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {topic.keywords.join(", ")}
        </ThemedText>
      ) : null}
    </View>
  );
}

function EntityCard({ entity }: { entity: EntityInsight }) {
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
        {entity.text}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {entity.type} · {entity.count}
      </ThemedText>
    </View>
  );
}

function TwentyFourHourSummaryCard({
  summary,
  onRefresh,
  loading,
  error,
}: {
  summary?: TwentyFourHourSummary;
  onRefresh: () => void;
  loading: boolean;
  error?: string;
}) {
  const { theme } = useTheme();
  const insights = summary?.insights;

  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Feather name="clock" size={20} color={theme.primary} />
        <ThemedText type="h4">Last 24 hours</ThemedText>
        <Pressable
          onPress={onRefresh}
          disabled={loading}
          style={[styles.refreshBtn, { borderColor: theme.primary }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather name="refresh-cw" size={16} color={theme.primary} />
          )}
        </Pressable>
      </View>

      {error ? (
        <ThemedText type="body" style={{ color: theme.categoryImportant }}>
          {error}
        </ThemedText>
      ) : null}

      {summary ? (
        <>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            {summary.summary}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            Based on {summary.messageCount} message{summary.messageCount === 1 ? "" : "s"} · Sentiment: {insights?.sentiment ?? "Neutral"}
          </ThemedText>
          {insights?.keyDecisions?.length ? (
            <>
              <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                Key decisions
              </ThemedText>
              <BulletList items={insights.keyDecisions} />
            </>
          ) : null}
          {insights?.assignedTasks?.length ? (
            <>
              <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.sm, marginBottom: Spacing.xs }}>
                Assigned tasks
              </ThemedText>
              <BulletList items={insights.assignedTasks} />
            </>
          ) : null}
          {insights?.pendingActions?.length ? (
            <>
              <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.sm, marginBottom: Spacing.xs }}>
                Pending actions
              </ThemedText>
              <BulletList items={insights.pendingActions} />
            </>
          ) : null}
          {insights?.blockers?.length ? (
            <>
              <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.sm, marginBottom: Spacing.xs }}>
                Blockers & risks
              </ThemedText>
              <BulletList items={insights.blockers} />
            </>
          ) : null}
          {insights?.peopleMentioned?.length ? (
            <>
              <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.sm, marginBottom: Spacing.xs }}>
                People mentioned
              </ThemedText>
              <BulletList items={insights.peopleMentioned} />
            </>
          ) : null}
        </>
      ) : !loading && !error ? (
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Tap refresh to generate an executive summary of the last 24 hours.
        </ThemedText>
      ) : null}
    </Card>
  );
}

function MetadataCard({ metadata }: { metadata: MetadataInsight }) {
  const { theme } = useTheme();
  const lines = [
    `Chat: ${metadata.chat_name || "Untitled"}`,
    `Type: ${metadata.chat_type}`,
    `Current user: ${metadata.current_user}`,
    `Participants: ${metadata.participants.join(", ") || "None"}`,
    `Processed: ${metadata.processed_at ? new Date(metadata.processed_at).toLocaleString() : "Unknown"}`,
    `Pipeline: ${metadata.pipeline_version || "Unknown"}`,
  ];

  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Feather name="info" size={20} color={theme.primary} />
        <ThemedText type="h4">Metadata</ThemedText>
      </View>
      <BulletList items={lines} />
    </Card>
  );
}

export default function ChatAnalysisScreen() {
  const screen = useStackScreenInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<DashboardRouteProp>();
  const { theme } = useTheme();
  const { getChatById, isLoading, updateChat } = useChats();
  const [currentUser, setCurrentUser] = useState("Me");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("Overview");

  const INSIGHT_TABS = ["Overview", "Priorities", "Actions", "Chat"];

  useEffect(() => {
    AsyncStorage.getItem("@ConvoInsight_whatsAppName").then((name) => {
      if (name) setCurrentUser(name);
    });
  }, []);

  const chat = getChatById(route.params.chatId);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

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
    entities,
    topics,
    sentiment,
    analytics,
    metadata,
  } = chat.extractedData;

  const themes = conversationSummary?.themes ?? [];
  const keyDecisions = conversationSummary?.key_decisions ?? [];

  const isOutgoing = (sender: string) =>
    sender.trim().toLowerCase() === currentUser.trim().toLowerCase();

  const fetchTwentyFourHourSummary = async () => {
    if (!chat) return;
    const chatId = chat.jobId || chat.id;
    setSummaryLoading(true);
    setSummaryError(undefined);
    try {
      const chatType =
        chat.extractedData.metadata?.chat_type === "group" ? "group" : "individual";
      const result = await summarizeChat24h({ chatId, chatType });
      const payload: TwentyFourHourSummary = {
        summary: result.summary,
        insights: result.insights ?? {
          keyDecisions: [],
          assignedTasks: [],
          pendingActions: [],
          blockers: [],
          peopleMentioned: [],
          sentiment: "Neutral",
        },
        messageCount: result.messageCount ?? 0,
        generatedAt: new Date().toISOString(),
      };
      await updateChat(chat.id, { twentyFourHourSummary: payload });
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Could not load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

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
        <Surface style={styles.headerCard} elevated>
          <View style={styles.headerTop}>
            <ThemedText type="h3" style={{ flex: 1 }} numberOfLines={2}>
              {chat.name}
            </ThemedText>
            <CategoryBadge category={chat.category} />
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Analyzed {new Date(chat.analyzedAt).toLocaleString()} · {analytics.total_messages} messages
          </ThemedText>
        </Surface>

        <SegmentedControl
          options={INSIGHT_TABS}
          selected={activeTab}
          onSelect={setActiveTab}
        />

        {(activeTab === "Overview" || activeTab === "Priorities") ? (
          <PriorityDashboardCards priorities={priorities as PrioritiesBucket} />
        ) : null}

        {activeTab === "Overview" ? (
        <>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Feather name="bar-chart-2" size={20} color={theme.primary} />
            <ThemedText type="h4">Analytics</ThemedText>
          </View>
          <StatGrid analytics={analytics} />
        </Card>

        <SentimentCard sentiment={sentiment} />

        <TwentyFourHourSummaryCard
          summary={chat.twentyFourHourSummary}
          onRefresh={fetchTwentyFourHourSummary}
          loading={summaryLoading}
          error={summaryError}
        />

        {chat.summary ? (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Feather name="zap" size={20} color={theme.primary} />
              <ThemedText type="h4">Overview</ThemedText>
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {chat.summary}
            </ThemedText>
          </Card>
        ) : null}

        {themes.length > 0 ? (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Feather name="layers" size={20} color={theme.primary} />
              <ThemedText type="h4">Conversation themes</ThemedText>
            </View>
            <BulletList items={themes} />
          </Card>
        ) : null}

        {keyDecisions.length > 0 ? (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Feather name="check-circle" size={20} color={theme.categoryActionable} />
              <ThemedText type="h4">Key decisions</ThemedText>
            </View>
            <BulletList items={keyDecisions} />
          </Card>
        ) : null}
        </>
        ) : null}

        {activeTab === "Priorities" ? (
        <>
        <PrioritySection
          title="Urgent"
          level="urgent"
          items={priorities.urgent}
          icon="alert-circle"
          color={theme.priorityUrgent}
        />
        <PrioritySection
          title="Moderate"
          level="moderate"
          items={priorities.moderate}
          icon="alert-triangle"
          color={theme.priorityModerate}
        />
        <PrioritySection
          title="Low priority"
          level="low"
          items={priorities.low}
          icon="check-circle"
          color={theme.priorityLow}
        />
        </>
        ) : null}

        {activeTab === "Actions" ? (
        <>
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

        <CollapsibleSection
          title="Topics"
          icon="hash"
          count={topics.length}
          defaultExpanded={false}
        >
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Entities"
          icon="tag"
          count={entities.length}
          defaultExpanded={false}
        >
          {entities.map((entity, index) => (
            <EntityCard key={`${entity.type}-${entity.text}-${index}`} entity={entity} />
          ))}
        </CollapsibleSection>

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
        </>
        ) : null}

        {activeTab === "Chat" ? (
        <>
        {chat.messages.length > 0 ? (
          <View style={styles.section}>
            <View
              style={[
                styles.chatPreview,
                { backgroundColor: theme.chatWallpaper },
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
          </View>
        ) : (
          <Card style={styles.summaryCard}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No message preview available for this chat.
            </ThemedText>
          </Card>
        )}
        <MetadataCard metadata={metadata} />
        </>
        ) : null}

        <Button
          variant="secondary"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })}
          style={{ marginBottom: Spacing.xl }}
        >
          Back to app
        </Button>
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
  headerCard: {
    marginBottom: Spacing.md,
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
  refreshBtn: {
    marginLeft: "auto",
    padding: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
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
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statTile: {
    width: "31%",
    minWidth: 92,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  doneButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
});
