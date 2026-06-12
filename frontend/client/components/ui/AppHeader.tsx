import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ConvoInsightLogo } from "@/components/brand/ConvoInsightLogo";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  large?: boolean;
  showBrand?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  large = false,
  showBrand = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.sm,
          backgroundColor: theme.headerBackground,
        },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={theme.headerForeground} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.titleWrap}>
          {showBrand ? (
            <ConvoInsightLogo variant="header" size={large ? "md" : "sm"} />
          ) : (
            <ThemedText
              type={large ? "h3" : "h4"}
              style={{ color: theme.headerForeground }}
              numberOfLines={1}
            >
              {title}
            </ThemedText>
          )}
          {subtitle ? (
            <ThemedText
              type="small"
              style={{ color: theme.headerForegroundMuted, marginTop: 2 }}
              numberOfLines={2}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.right}>{rightAction ?? <View style={styles.backPlaceholder} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: { width: 36 },
  titleWrap: { flex: 1, minWidth: 0 },
  right: { minWidth: 36, flexShrink: 0, alignItems: "flex-end" },
});
