import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Settings } from "@/types";

const SETTINGS_STORAGE_KEY = "@ConvoInsight_settings";

const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: true,
  urgentAlertsEnabled: true,
  dailySummaryEnabled: false,
  dataRetentionDays: 90,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        SETTINGS_STORAGE_KEY,
        "@ConvoInsight_chats",
        "@ConvoInsight_actions",
      ]);
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    clearAllData,
  };
}
