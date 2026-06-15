import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Chat, PrioritiesBucket } from "@/types";
import {
  EMPTY_ANALYTICS,
  EMPTY_PRIORITIES,
  EMPTY_CONVERSATION_SUMMARY,
  EMPTY_METADATA,
  EMPTY_SENTIMENT,
} from "@/lib/transform-analysis";

const CHATS_STORAGE_KEY = "@ConvoInsight_chats";

type StoredChat = Omit<Chat, "extractedData"> & {
  extractedData: Partial<Chat["extractedData"]>;
};

function normalizeChat(chat: StoredChat): Chat {
  const priorities: PrioritiesBucket =
    chat.extractedData?.priorities ?? EMPTY_PRIORITIES;
  const conversationSummary =
    chat.extractedData?.conversationSummary ?? EMPTY_CONVERSATION_SUMMARY;
  return {
    ...chat,
    isRead: chat.isRead ?? false,
    extractedData: {
      ...chat.extractedData,
      actionItems: chat.extractedData?.actionItems ?? [],
      businessOrders: chat.extractedData?.businessOrders ?? [],
      meetings: chat.extractedData?.meetings ?? [],
      importantMessages: chat.extractedData?.importantMessages ?? [],
      senderInsights: chat.extractedData?.senderInsights ?? [],
      priorities,
      conversationSummary,
      entities: chat.extractedData?.entities ?? [],
      topics: chat.extractedData?.topics ?? [],
      sentiment: chat.extractedData?.sentiment ?? EMPTY_SENTIMENT,
      analytics: chat.extractedData?.analytics ?? EMPTY_ANALYTICS,
      metadata: chat.extractedData?.metadata ?? EMPTY_METADATA,
    },
  };
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      if (stored) {
        const parsed: StoredChat[] = JSON.parse(stored);
        setChats(parsed.map(normalizeChat));
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveChats = async (newChats: Chat[]) => {
    try {
      await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(newChats));
      setChats(newChats);
    } catch (error) {
      console.error("Failed to save chats:", error);
    }
  };

  const addChat = useCallback(async (chat: Chat) => {
    const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
    const existingChats: StoredChat[] = stored ? JSON.parse(stored) : chats;
    const newChats = [normalizeChat(chat), ...existingChats.map(normalizeChat)];
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(newChats));
    setChats(newChats);
  }, [chats]);

  const updateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    try {
      const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      const existingChats: StoredChat[] = stored
        ? JSON.parse(stored)
        : chats.map((c) => ({ ...c, extractedData: c.extractedData }));
      const newChats = existingChats.map((chat) =>
        chat.id === chatId ? normalizeChat({ ...chat, ...updates }) : normalizeChat(chat)
      );
      await saveChats(newChats);
    } catch (error) {
      console.error("Failed to update chat:", error);
    }
  }, [chats]);

  const deleteChat = useCallback(async (chatId: string) => {
    const newChats = chats.filter((chat) => chat.id !== chatId);
    await saveChats(newChats);
  }, [chats]);

  const markChatAsRead = useCallback(async (chatId: string) => {
    try {
      const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      if (!stored) return;

      const parsed: StoredChat[] = JSON.parse(stored);
      const index = parsed.findIndex((c) => c.id === chatId);
      if (index === -1 || parsed[index].isRead) return;

      parsed[index] = {
        ...parsed[index],
        isRead: true,
        readAt: new Date().toISOString(),
      };
      const normalized = parsed.map(normalizeChat);
      await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(normalized));
      setChats(normalized);
    } catch (error) {
      console.error("Failed to mark chat as read:", error);
    }
  }, []);

  const getChatById = useCallback(
    (chatId: string) => chats.find((chat) => chat.id === chatId),
    [chats]
  );

  const clearAllChats = useCallback(async () => {
    await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    setChats([]);
  }, []);

  /** Removes generated summaries while keeping analyzed chats and insights. */
  const clearSummaryCache = useCallback(async () => {
    const cleared = chats.map((chat) => {
      const { twentyFourHourSummary: _, ...rest } = chat;
      return rest;
    });
    await saveChats(cleared);
  }, [chats]);

  return {
    chats,
    isLoading,
    addChat,
    updateChat,
    deleteChat,
    markChatAsRead,
    getChatById,
    clearAllChats,
    clearSummaryCache,
    refreshChats: loadChats,
  };
}
