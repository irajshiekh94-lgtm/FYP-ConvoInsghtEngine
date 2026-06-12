import { useThemeContext } from "@/context/ThemeProvider";

export type { ThemePreference, ColorScheme, ThemeColors } from "@/context/ThemeProvider";

/** @deprecated Use setThemePreference or setDarkMode instead. */
export function useTheme() {
  const ctx = useThemeContext();
  return {
    theme: ctx.theme,
    isDark: ctx.isDark,
    colorScheme: ctx.colorScheme,
    themePreference: ctx.themePreference,
    setThemePreference: ctx.setThemePreference,
    setDarkMode: ctx.setDarkMode,
    isReady: ctx.isReady,
    toggleTheme: ctx.setDarkMode,
  };
}
