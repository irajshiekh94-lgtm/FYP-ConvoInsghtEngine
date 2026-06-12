import React from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
}

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = "primary",
  icon,
  loading = false,
}: ButtonProps) {
  const { theme } = useTheme();

  const variantStyles = {
    primary: {
      bg: theme.primary,
      text: theme.onPrimary,
      border: theme.primary,
    },
    secondary: {
      bg: theme.backgroundSecondary,
      text: theme.text,
      border: theme.backgroundSecondary,
    },
    outline: {
      bg: "transparent",
      text: theme.primary,
      border: theme.primary,
    },
    ghost: {
      bg: "transparent",
      text: theme.primary,
      border: "transparent",
    },
  }[variant];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
        variant === "outline" && styles.outline,
        style,
      ]}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text} />
      ) : (
        <>
          {icon ? (
            <Feather name={icon} size={18} color={variantStyles.text} style={styles.icon} />
          ) : null}
          <ThemedText type="body" style={[styles.buttonText, { color: variantStyles.text }]}>
            {children}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    flexDirection: "row",
  },
  outline: {
    borderWidth: 1.5,
  },
  buttonText: {
    fontWeight: "600",
  },
  icon: {
    marginRight: Spacing.sm,
  },
});
