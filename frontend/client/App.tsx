import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme as NavigationTheme,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UrgentNotificationsBridge } from "@/components/UrgentNotificationsBridge";
import { ThemeProvider } from "@/context/ThemeProvider";
import { useTheme } from "@/hooks/useTheme";
import { bootstrapApp } from "@/lib/app-bootstrap";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { isDark, theme } = useTheme();
  const [boot, setBoot] = useState<{ ready: boolean; loggedIn: boolean }>({
    ready: false,
    loggedIn: false,
  });
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    bootstrapApp().then((state) => {
      if (mounted) {
        setBoot({ ready: true, loggedIn: state.loggedIn });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const navigationTheme = useMemo((): NavigationTheme => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: theme.primary,
        background: theme.backgroundRoot,
        card: theme.surfaceElevated,
        text: theme.text,
        border: theme.border,
        notification: theme.error,
      },
    };
  }, [isDark, theme]);

  const onNavReady = useCallback(() => {
    setNavReady(true);
  }, []);

  useEffect(() => {
    if (boot.ready && navReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [boot.ready, navReady]);

  if (!boot.ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <NavigationContainer theme={navigationTheme} onReady={onNavReady}>
          <UrgentNotificationsBridge />
          <RootStackNavigator initialLoggedIn={boot.loggedIn} />
        </NavigationContainer>
        <StatusBar style={isDark ? "light" : "dark"} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppNavigation />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
