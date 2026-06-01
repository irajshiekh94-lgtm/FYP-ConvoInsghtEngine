import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

const THEME_STORAGE_KEY = "@ConvoInsight_theme";

export function useTheme() {
  const systemColorScheme = useSystemColorScheme();
  const [userTheme, setUserTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        setUserTheme(stored);
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const toggleTheme = useCallback(async () => {
    const newTheme = isDark ? "light" : "dark";
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setUserTheme(newTheme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }, [userTheme, systemColorScheme]);

  const colorScheme = userTheme ?? systemColorScheme ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];

  return {
    theme,
    isDark,
    toggleTheme,
    colorScheme,
  };
}
