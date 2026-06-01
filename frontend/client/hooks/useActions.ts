/*import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActionItem } from "@/types";

const ACTIONS_STORAGE_KEY = "@ConvoInsight_actions";

export function useActions() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIONS_STORAGE_KEY);
      if (stored) {
        setActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load actions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveActions = async (newActions: ActionItem[]) => {
    try {
      await AsyncStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(newActions));
      setActions(newActions);
    } catch (error) {
      console.error("Failed to save actions:", error);
    }
  };

  const addActions = useCallback(async (newItems: ActionItem[]) => {
    const updated = [...newItems, ...actions];
    await saveActions(updated);
  }, [actions]);

  const toggleAction = useCallback(async (actionId: string) => {
    const updated = actions.map((action) =>
      action.id === actionId
        ? { ...action, completed: !action.completed }
        : action
    );
    await saveActions(updated);
  }, [actions]);

  const deleteAction = useCallback(async (actionId: string) => {
    const updated = actions.filter((action) => action.id !== actionId);
    await saveActions(updated);
  }, [actions]);

  const deleteActionsByChatId = useCallback(async (chatId: string) => {
    const updated = actions.filter((action) => action.chatId !== chatId);
    await saveActions(updated);
  }, [actions]);

  const clearAllActions = useCallback(async () => {
    await AsyncStorage.removeItem(ACTIONS_STORAGE_KEY);
    setActions([]);
  }, []);

  return {
    actions,
    isLoading,
    addActions,
    toggleAction,
    deleteAction,
    deleteActionsByChatId,
    clearAllActions,
    refreshActions: loadActions,
  };
}
*/
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActionItem } from "@/types";

const ACTIONS_STORAGE_KEY = "@ConvoInsight_actions";
const DUMMY_ACTIONS_INITIALIZED_KEY = "@ConvoInsight_dummy_actions_initialized";

// Dummy data
const DUMMY_ACTIONS: ActionItem[] = [
  {
    id: "action_1",
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
    id: "action_2",
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
    id: "action_3",
    chatId: "dummy_1",
    chatName: "Team Project Discussion",
    content: "Review API documentation",
    type: "task",
    urgency: "medium",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    completed: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "action_4",
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
    id: "action_5",
    chatId: "dummy_4",
    chatName: "Customer Order - Ahmad",
    content: "Arrange express shipping",
    type: "order",
    urgency: "high",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    completed: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "action_6",
    chatId: "dummy_2",
    chatName: "Client Requirements",
    content: "Schedule follow-up call with client",
    type: "meeting",
    urgency: "medium",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    completed: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "action_7",
    chatId: "dummy_3",
    chatName: "Family Group",
    content: "Book flight tickets",
    type: "task",
    urgency: "low",
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    completed: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "action_8",
    chatId: "dummy_1",
    chatName: "Team Project Discussion",
    content: "Update test cases",
    type: "task",
    urgency: "low",
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // Overdue
    completed: false,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "action_9",
    chatId: "dummy_1",
    chatName: "Team Project Discussion",
    content: "Setup development environment",
    type: "task",
    urgency: "medium",
    dueDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed: true, // Completed item
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export function useActions() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIONS_STORAGE_KEY);
      const dummyInitialized = await AsyncStorage.getItem(DUMMY_ACTIONS_INITIALIZED_KEY);
      
      if (stored) {
        setActions(JSON.parse(stored));
      } else if (!dummyInitialized) {
        // First time - initialize with dummy data
        await AsyncStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(DUMMY_ACTIONS));
        await AsyncStorage.setItem(DUMMY_ACTIONS_INITIALIZED_KEY, "true");
        setActions(DUMMY_ACTIONS);
      }
    } catch (error) {
      console.error("Failed to load actions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveActions = async (newActions: ActionItem[]) => {
    try {
      await AsyncStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(newActions));
      setActions(newActions);
    } catch (error) {
      console.error("Failed to save actions:", error);
    }
  };

  const addActions = useCallback(async (newItems: ActionItem[]) => {
    setActions((prev) => {
      const updated = [...newItems, ...prev];
      void AsyncStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleAction = useCallback(async (actionId: string) => {
    const updated = actions.map((action) =>
      action.id === actionId
        ? { ...action, completed: !action.completed }
        : action
    );
    await saveActions(updated);
  }, [actions]);

  const deleteAction = useCallback(async (actionId: string) => {
    const updated = actions.filter((action) => action.id !== actionId);
    await saveActions(updated);
  }, [actions]);

  const deleteActionsByChatId = useCallback(async (chatId: string) => {
    const updated = actions.filter((action) => action.chatId !== chatId);
    await saveActions(updated);
  }, [actions]);

  const clearAllActions = useCallback(async () => {
    await AsyncStorage.removeItem(ACTIONS_STORAGE_KEY);
    await AsyncStorage.removeItem(DUMMY_ACTIONS_INITIALIZED_KEY);
    setActions([]);
  }, []);

  return {
    actions,
    isLoading,
    addActions,
    toggleAction,
    deleteAction,
    deleteActionsByChatId,
    clearAllActions,
    refreshActions: loadActions,
  };
}