import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius } from "@/constants/theme";

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ name, color, size = 48 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + "22",
          borderColor: color + "55",
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ color, fontWeight: "700", fontSize: size * 0.32 }}
      >
        {initials || "?"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
