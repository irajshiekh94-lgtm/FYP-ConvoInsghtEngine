import React, { useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Chat } from "@/types";

const FILTER_OPTIONS = ["All", "Important", "Actionable", "General", "Business"];

// Returns a color per category for the avatar ring
function getCategoryColor(category: string, theme: any): string {
  switch (category.toLowerCase()) {
    case "important":  return theme.categoryImportant;
    case "actionable": return theme.categoryActionable;
    case "business":   return theme.categoryBusiness;
    default:           return theme.categoryGeneral;
  }
}

// Avatar with initials
function ChatAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.avatar, { backgroundColor: color + "22", borderColor: color }]}>
      <ThemedText type="small" style={{ color, fontWeight: "700", fontSize: 15 }}>
        {initials}
      </ThemedText>
    </View>
  );
}

function ChatListItem({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  const { theme } = useTheme();
  const categoryColor = getCategoryColor(chat.category, theme);
  const dateStr = new Date(chat.analyzedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chatItem,
        {
          backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
        },
      ]}
      onPress={onPress}
    >
      {/* Left: Avatar */}
      <ChatAvatar name={chat.name} color={categoryColor} />

      {/* Center: Content */}
      <View style={styles.chatItemContent}>
        <View style={styles.chatItemHeader}>
          <ThemedText type="body" style={styles.chatName} numberOfLines={1}>
            {chat.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {dateStr}
          </ThemedText>
        </View>

        {(() => {
          const preview =
            chat.extractedData.senderInsights?.[0]?.summary ||
            chat.summary?.split("\n")[0];
          return preview ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
              numberOfLines={1}
            >
              {preview}
            </ThemedText>
          ) : null;
        })()}

        <View style={styles.chatItemFooter}>
          <CategoryBadge category={chat.category} size="small" />
          {chat.actionCount > 0 ? (
            <View style={[styles.actionBadge, { backgroundColor: theme.categoryActionable + "22" }]}>
              <Feather name="check-square" size={11} color={theme.categoryActionable} />
              <ThemedText type="caption" style={{ color: theme.categoryActionable, fontWeight: "600" }}>
                {chat.actionCount} actions
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right: Arrow */}
      <Feather name="chevron-right" size={18} color={theme.textSecondary} style={{ marginLeft: Spacing.sm }} />
    </Pressable>
  );
}

export default function ChatsScreen() {
  const screen = useTabScreenInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats } = useChats();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === "All" ||
      chat.category.toLowerCase() === selectedFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: theme.primary + "15" }]}>
        <Feather name="message-circle" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No chats imported yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyDescription, { color: theme.textSecondary }]}>
        Tap the + button to import your first WhatsApp chat
      </ThemedText>
    </View>
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: theme.border }]} />
  );

  return (
    <ThemedView style={styles.container}>

      {/* ── Search + Filter Header ── */}
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: screen.paddingTop,
            backgroundColor: theme.backgroundRoot,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {/* Search Bar */}
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: searchFocused ? theme.primary : "transparent",
              borderWidth: searchFocused ? 1.5 : 1.5,
            },
          ]}
        >
          <Feather
            name="search"
            size={18}
            color={searchFocused ? theme.primary : theme.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search chats..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              style={[styles.clearBtn, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={13} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isSelected = selectedFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                    shadowColor: isSelected ? theme.primary : "transparent",
                    shadowOpacity: 0.3,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    elevation: isSelected ? 3 : 0,
                  },
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: isSelected ? "#FFFFFF" : theme.text,
                    fontWeight: isSelected ? "700" : "400",
                  }}
                >
                  {filter}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Result count */}
        {chats.length > 0 ? (
          <ThemedText type="caption" style={[styles.resultCount, { color: theme.textSecondary }]}>
            {filteredChats.length} {filteredChats.length === 1 ? "chat" : "chats"}
          </ThemedText>
        ) : null}
      </View>

      {/* ── Chat List ── */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            onPress={() => navigation.navigate("Dashboard", { chatId: item.id })}
          />
        )}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={{
          paddingBottom: screen.paddingBottom,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: screen.scrollIndicatorBottom }}
        ListEmptyComponent={renderEmptyState}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  resultCount: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },

  // ── Chat Item ──
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  chatName: {
    fontWeight: "600",
    flex: 1,
    marginRight: Spacing.sm,
    fontSize: 15,
  },
  chatItemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + 48 + Spacing.md, // aligns with text, skips avatar
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
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
    lineHeight: 22,
  },
});