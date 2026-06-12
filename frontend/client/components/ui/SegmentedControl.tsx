import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({
  options,
  selected,
  onSelect,
  style,
}: SegmentedControlProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.backgroundDefault },
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {options.map((option) => {
          const isActive = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.segment,
                isActive && {
                  backgroundColor: theme.surfaceElevated,
                  ...styles.activeShadow,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: isActive ? theme.primary : theme.textSecondary,
                  fontWeight: isActive ? "600" : "400",
                }}
              >
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  scroll: {
    flexDirection: "row",
    gap: 2,
  },
  segment: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 72,
    alignItems: "center",
  },
  activeShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
});
