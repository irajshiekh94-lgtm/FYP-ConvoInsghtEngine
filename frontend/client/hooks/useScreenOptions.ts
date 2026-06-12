import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = false,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    headerBlurEffect: transparent ? (isDark ? "dark" : "light") : undefined,
    headerTintColor: theme.headerForeground,
    headerTitleStyle: {
      color: theme.headerForeground,
      fontWeight: "600",
    },
    headerStyle: {
      backgroundColor: transparent
        ? Platform.select({ ios: undefined, default: theme.headerBackground })
        : theme.headerBackground,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    animation: "slide_from_right",
    fullScreenGestureEnabled: Platform.OS === "ios",
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
