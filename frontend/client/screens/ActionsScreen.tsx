import React, { useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useActions } from "@/hooks/useActions";
import { ActionItem as ActionItemType } from "@/types";

const SEGMENTS = ["Pending", "Completed", "Overdue"];

function ActionItemCard({
  item,
  onToggle,
}: {
  item: ActionItemType;
  onToggle: () => void;
}) {
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
    <Pressable
      style={[
        styles.actionCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderLeftColor: getUrgencyColor(),
        },
      ]}
      onPress={onToggle}
    >
      <Pressable style={styles.checkboxContainer} onPress={onToggle}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: item.completed ? theme.success : theme.textSecondary,
              backgroundColor: item.completed ? theme.success : "transparent",
            },
          ]}
        >
          {item.completed ? (
            <Feather name="check" size={14} color="#FFFFFF" />
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actionContent}>
        <ThemedText
          type="body"
          style={[
            styles.actionText,
            item.completed && { textDecorationLine: "line-through", opacity: 0.6 },
          ]}
          numberOfLines={2}
        >
          {item.content}
        </ThemedText>
        <View style={styles.actionMeta}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {item.chatName}
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
        <View style={styles.badges}>
          <View
            style={[
              styles.urgencyBadge,
              { backgroundColor: getUrgencyColor() },
            ]}
          >
            <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
              {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.text }}>
              {item.type}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function ActionsScreen() {
  const screen = useTabScreenInsets();
  const { theme } = useTheme();
  const { actions, toggleAction } = useActions();
  const [selectedSegment, setSelectedSegment] = useState("Pending");

  const filteredActions = actions.filter((action) => {
    const now = new Date();
    const dueDate = action.dueDate ? new Date(action.dueDate) : null;
    const isOverdue = dueDate && dueDate < now && !action.completed;

    switch (selectedSegment) {
      case "Pending":
        return !action.completed && !isOverdue;
      case "Completed":
        return action.completed;
      case "Overdue":
        return isOverdue;
      default:
        return true;
    }
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="check-circle" size={64} color={theme.textSecondary} />
      <ThemedText type="h4" style={styles.emptyTitle}>
        No {selectedSegment.toLowerCase()} items
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyDescription, { color: theme.textSecondary }]}
      >
        {selectedSegment === "Pending"
          ? "Your action items will appear here after analyzing chats"
          : selectedSegment === "Completed"
          ? "Completed items will show here"
          : "No overdue items"}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Card
        style={[
          styles.segmentContainer,
          {
            paddingTop: screen.paddingTop,
            paddingHorizontal: screen.paddingHorizontal,
          },
        ]}
      >
        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          {SEGMENTS.map((segment) => (
            <Pressable
              key={segment}
              style={[
                styles.segmentButton,
                selectedSegment === segment && {
                  backgroundColor: theme.primary,
                },
              ]}
              onPress={() => setSelectedSegment(segment)}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedSegment === segment ? "#FFFFFF" : theme.text,
                  fontWeight: selectedSegment === segment ? "600" : "400",
                }}
              >
                {segment}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>
      <FlatList
        data={filteredActions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActionItemCard item={item} onToggle={() => toggleAction(item.id)} />
        )}
        contentContainerStyle={{
          paddingHorizontal: screen.paddingHorizontal,
          paddingTop: Spacing.md,
          paddingBottom: screen.paddingBottom,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: screen.scrollIndicatorBottom }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={renderEmptyState}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    paddingBottom: Spacing.md,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  actionCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
  },
  checkboxContainer: {
    marginRight: Spacing.md,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    marginBottom: Spacing.xs,
  },
  actionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
