import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ConvoInsightLogo } from "@/components/brand/ConvoInsightLogo";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface HeaderAction {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label?: string;
  loading?: boolean;
}

interface WhatsAppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: HeaderAction[];
  showBrand?: boolean;
}

export function WhatsAppHeader({
  title,
  subtitle,
  onBack,
  actions = [],
  showBrand = false,
}: WhatsAppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.xs,
          backgroundColor: theme.headerBackground,
        },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={theme.headerForeground} />
          </Pressable>
        ) : null}

        <View style={[styles.titleBlock, showBrand && styles.titleBlockBrand]}>
          {showBrand ? (
            <ConvoInsightLogo variant="header" size="sm" />
          ) : (
            <>
              <ThemedText
                type="h4"
                style={{ color: theme.headerForeground }}
                numberOfLines={1}
              >
                {title}
              </ThemedText>
              {subtitle ? (
                <ThemedText
                  type="caption"
                  style={{ color: theme.headerForegroundMuted }}
                  numberOfLines={1}
                >
                  {subtitle}
                </ThemedText>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.actions}>
          {actions.map((action, i) => (
            <Pressable
              key={i}
              onPress={action.loading ? undefined : action.onPress}
              style={styles.iconBtn}
              hitSlop={10}
              accessibilityLabel={action.label}
            >
              {action.loading ? (
                <ActivityIndicator size="small" color={theme.headerForeground} />
              ) : (
                <Feather name={action.icon} size={20} color={theme.headerForeground} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    gap: Spacing.xs,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
  },
  titleBlockBrand: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: "auto",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
