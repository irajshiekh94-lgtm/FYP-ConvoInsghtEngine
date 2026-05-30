import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { ActionItem, BusinessOrder, Meeting, ImportantMessage } from "@/types";

type ChatAnalysisRouteProp = RouteProp<RootStackParamList, "ChatAnalysis">;

function CollapsibleSection({
  title,
  icon,
  children,
  count,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
  count: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { theme } = useTheme();

  if (count === 0) return null;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Feather name={icon} size={20} color={theme.primary} />
          <ThemedText type="h4">{title}</ThemedText>
          <View
            style={[styles.countBadge, { backgroundColor: theme.primary }]}
          >
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

function ActionItemCard({ item }: { item: ActionItem }) {
  const { theme } = useTheme();

  const getUrgencyColor = () => {
    switch (item.urgency) {
      case "high":
        return theme.categoryUrgent;
      case "medium":
        return theme.categoryActionable;
      default:
        return theme.categoryGeneral;
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
        {item.dueDate ? (
          <View style={styles.dueDateContainer}>
            <Feather name="clock" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {new Date(item.dueDate).toLocaleDateString()}
            </ThemedText>
          </View>
        ) : null}
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
      <View style={styles.orderHeader}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {order.product}
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                order.status === "completed"
                  ? theme.success
                  : order.status === "confirmed"
                  ? theme.categoryActionable
                  : theme.categoryGeneral,
            },
          ]}
        >
          <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
            {order.status}
          </ThemedText>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <View style={styles.orderDetail}>
          <Feather name="package" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Qty: {order.quantity}
          </ThemedText>
        </View>
        {order.price ? (
          <View style={styles.orderDetail}>
            <Feather name="dollar-sign" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {order.price}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.orderDetail}>
          <Feather name="user" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {order.customerName}
          </ThemedText>
        </View>
      </View>
      {order.deliveryDate ? (
        <View style={styles.deliveryDate}>
          <Feather name="truck" size={14} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary }}>
            Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
          </ThemedText>
        </View>
      ) : null}
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
      <View style={styles.meetingDetails}>
        <View style={styles.meetingDetail}>
          <Feather name="calendar" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {new Date(meeting.date).toLocaleDateString()}
            {meeting.time ? ` at ${meeting.time}` : ""}
          </ThemedText>
        </View>
        {meeting.location ? (
          <View style={styles.meetingDetail}>
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {meeting.location}
            </ThemedText>
          </View>
        ) : null}
        {meeting.participants.length > 0 ? (
          <View style={styles.meetingDetail}>
            <Feather name="users" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {meeting.participants.join(", ")}
            </ThemedText>
          </View>
        ) : null}
      </View>
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
      <View style={styles.messageHeader}>
        <ThemedText type="small" style={{ fontWeight: "600" }}>
          {message.sender}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {new Date(message.timestamp).toLocaleString()}
        </ThemedText>
      </View>
      <ThemedText type="body">{message.content}</ThemedText>
      <View style={styles.reasonContainer}>
        <Feather name="alert-circle" size={12} color={theme.categoryActionable} />
        <ThemedText
          type="caption"
          style={{ color: theme.categoryActionable, flex: 1 }}
        >
          {message.reason}
        </ThemedText>
      </View>
    </View>
  );
}

export default function ChatAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<ChatAnalysisRouteProp>();
  const { theme } = useTheme();
  const { getChatById } = useChats();

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

  const { actionItems, businessOrders, meetings, importantMessages } =
    chat.extractedData;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
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

        {chat.summary ? (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Feather name="file-text" size={20} color={theme.primary} />
              <ThemedText type="h4">Summary</ThemedText>
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {chat.summary}
            </ThemedText>
          </View>
        ) : null}

        <CollapsibleSection
          title="Action Items"
          icon="check-square"
          count={actionItems.length}
        >
          {actionItems.map((item, index) => (
            <ActionItemCard key={index} item={item as ActionItem} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Business Orders"
          icon="briefcase"
          count={businessOrders.length}
        >
          {businessOrders.map((order, index) => (
            <BusinessOrderCard key={index} order={order} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Meetings & Events"
          icon="calendar"
          count={meetings.length}
        >
          {meetings.map((meeting, index) => (
            <MeetingCard key={index} meeting={meeting} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Important Messages"
          icon="alert-circle"
          count={importantMessages.length}
        >
          {importantMessages.map((message, index) => (
            <ImportantMessageCard key={index} message={message} />
          ))}
        </CollapsibleSection>
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
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.xl,
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
    gap: Spacing.md,
  },
  itemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 4,
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  orderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  orderDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deliveryDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  meetingDetails: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  meetingDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  messageCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
});
