/*import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Chat } from "@/types";

const CHATS_STORAGE_KEY = "@ConvoInsight_chats";

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
        setChats(JSON.parse(stored));
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
    const newChats = [chat, ...chats];
    await saveChats(newChats);
  }, [chats]);

  const updateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    const newChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, ...updates } : chat
    );
    await saveChats(newChats);
  }, [chats]);

  const deleteChat = useCallback(async (chatId: string) => {
    const newChats = chats.filter((chat) => chat.id !== chatId);
    await saveChats(newChats);
  }, [chats]);

  const getChatById = useCallback(
    (chatId: string) => chats.find((chat) => chat.id === chatId),
    [chats]
  );

  const clearAllChats = useCallback(async () => {
    await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    setChats([]);
  }, []);

  return {
    chats,
    isLoading,
    addChat,
    updateChat,
    deleteChat,
    getChatById,
    clearAllChats,
    refreshChats: loadChats,
  };
}
*/
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Chat } from "@/types";

const CHATS_STORAGE_KEY = "@ConvoInsight_chats";
const DUMMY_INITIALIZED_KEY = "@ConvoInsight_dummy_initialized";

// Dummy data
const DUMMY_CHATS: Chat[] = [
  {
    id: "dummy_1",
    name: "Team Project Discussion",
    category: "business",
    analyzedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    summary: "Discussion about Q1 project deliverables, timeline adjustments, and resource allocation. Team agreed on new milestones and action items for the next sprint.",
    actionCount: 5,
    messages: [],
    extractedData: {
      actionItems: [
        {
          id: "dummy_1_action_1",
          chatId: "dummy_1",
          chatName: "Team Project Discussion",
          content: "Complete UI mockups for dashboard",
          type: "task",
          urgency: "high",
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: "dummy_1_action_2",
          chatId: "dummy_1",
          chatName: "Team Project Discussion",
          content: "Review API documentation",
          type: "task",
          urgency: "medium",
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],
      businessOrders: [],
      meetings: [
        {
          id: "dummy_1_meeting_1",
          title: "Sprint Planning",
          date: new Date(Date.now() + 86400000 * 3).toISOString(),
          time: "10:00 AM",
          location: "Conference Room A",
          participants: ["John", "Sarah", "Mike"],
        },
      ],
      importantMessages: [],
    },
  },
  {
    id: "dummy_2",
    name: "Client Requirements",
    category: "important",
    analyzedAt: new Date(Date.now() - 86400000).toISOString(),
    summary: "Client outlined new feature requirements and budget constraints. Need to revise proposal and submit updated timeline by end of week.",
    actionCount: 3,
    messages: [],
    extractedData: {
      actionItems: [
        {
          id: "dummy_2_action_1",
          chatId: "dummy_2",
          chatName: "Client Requirements",
          content: "Update project proposal with new features",
          type: "deadline",
          urgency: "high",
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "dummy_2_action_2",
          chatId: "dummy_2",
          chatName: "Client Requirements",
          content: "Schedule follow-up call with client",
          type: "meeting",
          urgency: "medium",
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      businessOrders: [],
      meetings: [],
      importantMessages: [
        {
          id: "dummy_2_msg_1",
          content: "Budget approval needed by Friday",
          sender: "Client Manager",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          reason: "Contains deadline and financial commitment",
        },
      ],
    },
  },
  {
    id: "dummy_3",
    name: "Family Group",
    category: "general",
    analyzedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    summary: "Family planning for upcoming vacation. Discussed destination options, budget, and travel dates. Mom suggested beach resort.",
    actionCount: 2,
    messages: [],
    extractedData: {
      actionItems: [
        {
          id: "dummy_3_action_1",
          chatId: "dummy_3",
          chatName: "Family Group",
          content: "Book flight tickets",
          type: "task",
          urgency: "low",
          dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
      ],
      businessOrders: [],
      meetings: [],
      importantMessages: [],
    },
  },
  {
    id: "dummy_4",
    name: "Customer Order - Ahmad",
    category: "business",
    analyzedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    summary: "Customer placed order for 50 units. Confirmed delivery address and payment terms. Express delivery requested.",
    actionCount: 4,
    messages: [],
    extractedData: {
      actionItems: [
        {
          id: "dummy_4_action_1",
          chatId: "dummy_4",
          chatName: "Customer Order - Ahmad",
          content: "Process payment confirmation",
          type: "order",
          urgency: "high",
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: "dummy_4_action_2",
          chatId: "dummy_4",
          chatName: "Customer Order - Ahmad",
          content: "Arrange express shipping",
          type: "order",
          urgency: "high",
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ],
      businessOrders: [
        {
          id: "dummy_4_order_1",
          product: "Premium Widget Set",
          quantity: 50,
          price: "PKR 125,000",
          deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          customerName: "Ahmad Khan",
          status: "pending",
        },
      ],
      meetings: [],
      importantMessages: [],
    },
  },
  {
    id: "dummy_5",
    name: "Marketing Campaign",
    category: "actionable",
    analyzedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    summary: "Planning for upcoming social media campaign. Discussed content calendar, budget allocation, and target metrics.",
    actionCount: 3,
    messages: [],
    extractedData: {
      actionItems: [
        {
          id: "dummy_5_action_1",
          chatId: "dummy_5",
          chatName: "Marketing Campaign",
          content: "Create content calendar for next month",
          type: "task",
          urgency: "medium",
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          completed: false,
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
      ],
      businessOrders: [],
      meetings: [
        {
          id: "dummy_5_meeting_1",
          title: "Marketing Review",
          date: new Date(Date.now() + 86400000 * 5).toISOString(),
          time: "2:00 PM",
          location: "Virtual - Zoom",
          participants: ["Marketing Team"],
        },
      ],
      importantMessages: [],
    },
  },
];

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
      const dummyInitialized = await AsyncStorage.getItem(DUMMY_INITIALIZED_KEY);
      
      if (stored) {
        setChats(JSON.parse(stored));
      } else if (!dummyInitialized) {
        // First time - initialize with dummy data
        await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(DUMMY_CHATS));
        await AsyncStorage.setItem(DUMMY_INITIALIZED_KEY, "true");
        setChats(DUMMY_CHATS);
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
    const newChats = [chat, ...chats];
    await saveChats(newChats);
  }, [chats]);

  const updateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    const newChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, ...updates } : chat
    );
    await saveChats(newChats);
  }, [chats]);

  const deleteChat = useCallback(async (chatId: string) => {
    const newChats = chats.filter((chat) => chat.id !== chatId);
    await saveChats(newChats);
  }, [chats]);

  const getChatById = useCallback(
    (chatId: string) => chats.find((chat) => chat.id === chatId),
    [chats]
  );

  const clearAllChats = useCallback(async () => {
    await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    setChats([]);
  }, []);

  return {
    chats,
    isLoading,
    addChat,
    updateChat,
    deleteChat,
    getChatById,
    clearAllChats,
    refreshChats: loadChats,
  };
}