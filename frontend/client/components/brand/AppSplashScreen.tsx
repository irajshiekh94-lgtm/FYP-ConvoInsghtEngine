import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConvoInsightLogo } from "@/components/brand/ConvoInsightLogo";
import { ThemedText } from "@/components/ThemedText";
import { BRAND_BG, Spacing } from "@/constants/theme";

export function AppSplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: BRAND_BG,
        },
      ]}
    >
      <View style={styles.center}>
        <ConvoInsightLogo size="xl" variant="full" />
        <ThemedText type="body" style={styles.tagline}>
          Turn WhatsApp chats into actionable insights
        </ThemedText>
      </View>
      <ActivityIndicator size="small" color="#FFFFFF" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  tagline: {
    textAlign: "center",
    marginTop: Spacing.xl,
    lineHeight: 22,
    maxWidth: 280,
    color: "rgba(255,255,255,0.72)",
  },
  loader: {
    marginBottom: Spacing["3xl"],
  },
});
