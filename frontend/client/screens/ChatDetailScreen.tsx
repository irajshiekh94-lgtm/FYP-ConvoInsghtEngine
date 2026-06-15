import React, { useState, useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { WhatsAppHeader } from "@/components/ui/WhatsAppHeader";
import { ChatModeTabs, type ChatViewMode } from "@/components/chat/ChatModeTabs";
import { ChatDashboardPanel } from "@/components/chat/ChatDashboardPanel";
import { ChatConversationPanel } from "@/components/chat/ChatConversationPanel";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { summarizeChat } from "@/lib/summarize-chat";
import { TwentyFourHourSummary } from "@/types";

type Route = RouteProp<RootStackParamList, "ChatDetail">;

export default function ChatDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const { getChatById, isLoading, updateChat, markChatAsRead } = useChats();
  const chatId = route.params.chatId;

  const [currentUser, setCurrentUser] = useState("Me");
  const [viewMode, setViewMode] = useState<ChatViewMode>("dashboard");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | undefined>();
  const [liveSummary, setLiveSummary] = useState<TwentyFourHourSummary | undefined>();

  useEffect(() => {
    setLiveSummary(undefined);
  }, [chatId]);

  useEffect(() => {
    AsyncStorage.getItem("@ConvoInsight_whatsAppName").then((name) => {
      if (name) setCurrentUser(name);
    });
  }, []);

  const chat = getChatById(chatId);

  useFocusEffect(
    React.useCallback(() => {
      if (chatId) {
        void markChatAsRead(chatId);
      }
    }, [chatId, markChatAsRead])
  );

  const fetchSummary = async () => {
    if (!chat) return;
    setSummaryLoading(true);
    setSummaryError(undefined);
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
      setLiveSummary(payload);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Could not load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!chat) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="h4">Chat not found</ThemedText>
      </ThemedView>
    );
  }

  const messageCount =
    chat.extractedData.analytics?.total_messages ?? chat.messages.length;

  const subtitle =
    viewMode === "dashboard"
      ? `${messageCount} messages`
      : `${chat.messages.length} messages in thread`;

  return (
    <ThemedView style={styles.container}>
      <WhatsAppHeader
        title={chat.name}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: "zap",
            label: "Summarize",
            onPress: fetchSummary,
            loading: summaryLoading,
          },
        ]}
      />

      <ChatModeTabs mode={viewMode} onModeChange={setViewMode} />

      {viewMode === "dashboard" ? (
        <ChatDashboardPanel
          chat={chat}
          summary={liveSummary ?? chat.twentyFourHourSummary}
          summaryLoading={summaryLoading}
          summaryError={summaryError}
          onRefreshSummary={fetchSummary}
        />
      ) : (
        <ChatConversationPanel
          messages={chat.messages}
          currentUser={currentUser}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
});
