import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ConvoInsightLogo } from "@/components/brand/ConvoInsightLogo";
import { Surface } from "@/components/ui/Surface";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const TAGLINE = "Too many messages? we got you covered!";

interface AuthScreenLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.hero,
          {
            paddingTop: insets.top + Spacing.xl,
            backgroundColor: theme.headerBackground,
          },
        ]}
      >
        <ConvoInsightLogo size="md" variant="full" animated />
        <ThemedText type="body" style={styles.heroTagline}>
          {TAGLINE}
        </ThemedText>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Surface elevated style={styles.card}>
          <ThemedText type="h3" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
          {children}
          {footer}
        </Surface>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroTagline: {
    textAlign: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    lineHeight: 22,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  card: {
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
});
