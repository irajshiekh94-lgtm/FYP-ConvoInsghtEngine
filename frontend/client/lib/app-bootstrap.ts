import AsyncStorage from "@react-native-async-storage/async-storage";
import { isLoggedIn } from "@/lib/auth";

const THEME_STORAGE_KEY = "@ConvoInsight_theme";

export interface AppBootstrapState {
  loggedIn: boolean;
}

export async function bootstrapApp(): Promise<AppBootstrapState> {
  const [, loggedIn] = await Promise.all([migrateThemePreference(), isLoggedIn()]);
  return { loggedIn };
}

export async function migrateThemePreference(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "system") {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, "light");
    }
  } catch {
    /* ignore */
  }
}
