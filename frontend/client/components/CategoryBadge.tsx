import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CategoryBadgeProps {
  category: string;
  size?: "small" | "default";
}

export function CategoryBadge({ category, size = "default" }: CategoryBadgeProps) {
  const { theme } = useTheme();

  const getCategoryColor = () => {
    switch (category.toLowerCase()) {
      case "important":
        return theme.categoryImportant;
      case "actionable":
        return theme.categoryActionable;
      case "business":
        return theme.categoryBusiness;
      case "urgent":
        return theme.categoryUrgent;
      default:
        return theme.categoryGeneral;
    }
  };

  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getCategoryColor(),
          paddingHorizontal: isSmall ? Spacing.xs : Spacing.sm,
          paddingVertical: isSmall ? 1 : 2,
        },
      ]}
    >
      <ThemedText
        type="caption"
        style={[styles.text, isSmall && styles.smallText]}
      >
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  smallText: {
    fontSize: 10,
  },
});
