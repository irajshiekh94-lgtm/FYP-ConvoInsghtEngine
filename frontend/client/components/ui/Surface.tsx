import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";

interface SurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: keyof typeof Spacing | number;
}

export function Surface({
  children,
  style,
  elevated = true,
  padding = "lg",
}: SurfaceProps) {
  const { theme } = useTheme();
  const pad = typeof padding === "number" ? padding : Spacing[padding];

  return (
    <View
      style={[
        styles.surface,
        elevated && Shadows.sm,
        {
          backgroundColor: theme.surfaceElevated,
          padding: pad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
});
