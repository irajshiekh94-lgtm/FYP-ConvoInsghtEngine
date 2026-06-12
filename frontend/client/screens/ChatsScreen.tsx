import React, { useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WhatsAppHeader } from "@/components/ui/WhatsAppHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { FAB_SIZE, FAB_OFFSET } from "@/constants/layout";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";
import { summarizeChat } from "@/lib/summarize-chat";
import { Chat, TwentyFourHourSummary } from "@/types";
import { getUnreadUrgentCount } from "@/lib/chat-read-state";

function getPreview(chat: Chat): string {
  const generated = chat.twentyFourHourSummary?.summary?.trim();
  if (generated) return generated;
  return "No summary yet — tap ⚡ to generate";
}

function ChatRow({
  chat,
  onPress,
  onLongPress,
  onSummarize,
  summarizing,
}: {
  chat: Chat;
  onPress: () => void;
  onLongPress: () => void;
  onSummarize: () => void;
  summarizing: boolean;
}) {
  const { theme } = useTheme();
  const unreadUrgentCount = getUnreadUrgentCount(chat);
  const timeStr = new Date(chat.analyzedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundRoot }]}>
      <Pressable
        style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
      >
        <Avatar name={chat.name} color={theme.primary} size={52} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <ThemedText type="body" style={styles.chatName} numberOfLines={1}>
              {chat.name}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {timeStr}
            </ThemedText>
          </View>
          <View style={styles.rowBottom}>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, flex: 1 }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {getPreview(chat)}
            </ThemedText>
            {unreadUrgentCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.priorityUrgent }]}>
                <ThemedText type="caption" style={{ color: theme.onPrimary, fontWeight: "700" }}>
                  {unreadUrgentCount}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable onPress={onSummarize} style={styles.summarizeBtn} hitSlop={8}>
        {summarizing ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Feather name="zap" size={18} color={theme.primary} />
        )}
      </Pressable>
    </View>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats, updateChat, deleteChat, markChatAsRead, refreshChats } = useChats();

  useFocusEffect(
    React.useCallback(() => {
      void refreshChats();
    }, [refreshChats])
  );
  const { deleteActionsByChatId } = useActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteChat = (chat: Chat) => {
    Alert.alert(
      "Delete chat",
      `Remove "${chat.name}" and all its insights? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteActionsByChatId(chat.id);
            await deleteChat(chat.id);
          },
        },
      ]
    );
  };

  const handleSummarize = async (chat: Chat) => {
    setSummarizingId(chat.id);
    try {
      const result = await summarizeChat(chat);
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
        period: result.period,
        generatedAt: new Date().toISOString(),
      };
      await updateChat(chat.id, { twentyFourHourSummary: payload });
      Alert.alert(
        "Summary ready",
        "Open the chat dashboard to read the full summary."
      );
    } catch (err) {
      Alert.alert(
        "Summarize failed",
        err instanceof Error ? err.message : "Could not generate summary"
      );
    } finally {
      setSummarizingId(null);
    }
  };

  const fabBottom = insets.bottom + FAB_OFFSET;

  return (
    <ThemedView style={styles.container}>
      <WhatsAppHeader
        title="ConvoInsight"
        showBrand
        actions={[
          { icon: "settings", onPress: () => navigation.navigate("Settings"), label: "Settings" },
        ]}
      />

      <View style={[styles.searchWrap, { backgroundColor: theme.headerBackground }]}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search chats" />
      </View>

      {chats.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={64} color={theme.textSecondary} />
          <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
            No chats yet
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            Import a WhatsApp export to get started
          </ThemedText>
          <Pressable
            style={[styles.emptyCta, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("Upload")}
          >
            <Feather name="upload-cloud" size={20} color={theme.onPrimary} />
            <ThemedText type="body" style={{ color: theme.onPrimary, fontWeight: "600" }}>
              Upload chat
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatRow
              chat={item}
              onPress={() => {
                void markChatAsRead(item.id);
                navigation.navigate("ChatDetail", { chatId: item.id });
              }}
              onLongPress={() => handleDeleteChat(item)}
              onSummarize={() => handleSummarize(item)}
              summarizing={summarizingId === item.id}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.divider }]} />
          )}
          contentContainerStyle={{ paddingBottom: fabBottom + FAB_SIZE + Spacing.lg }}
        />
      )}

      {chats.length > 0 ? (
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: fabBottom,
            },
          ]}
          onPress={() => navigation.navigate("Upload")}
        >
          <Feather name="plus" size={28} color={theme.onPrimary} />
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: { fontWeight: "600", flex: 1, marginRight: Spacing.sm },
  rowBottom: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  summarizeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg + 52 + Spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
