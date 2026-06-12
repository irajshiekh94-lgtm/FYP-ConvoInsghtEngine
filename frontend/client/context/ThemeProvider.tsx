import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";
import { migrateThemePreference } from "@/lib/app-bootstrap";

const THEME_STORAGE_KEY = "@ConvoInsight_theme";

export type ThemePreference = "light" | "dark";
export type ColorScheme = "light" | "dark";
export type ThemeColors = (typeof Colors)["light"];

interface ThemeContextValue {
  theme: ThemeColors;
  isDark: boolean;
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("light");

  useEffect(() => {
    let mounted = true;
    (async () => {
      await migrateThemePreference();
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (mounted && (stored === "light" || stored === "dark")) {
          setThemePreferenceState(stored);
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setThemePreferenceState(preference);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }, []);

  const setDarkMode = useCallback(
    async (enabled: boolean) => {
      await setThemePreference(enabled ? "dark" : "light");
    },
    [setThemePreference]
  );

  const colorScheme: ColorScheme = themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: Colors[colorScheme],
      isDark: colorScheme === "dark",
      colorScheme,
      themePreference,
      setThemePreference,
      setDarkMode,
      isReady: true,
    }),
    [colorScheme, themePreference, setThemePreference, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
