import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import LogoImage from "../../../assets/images/ConvoInsightLogo.png";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "mark" | "header";

/** Source asset: 561 × 444 — icon occupies ~top 56%. */
const LOGO_ASPECT = 444 / 561;
const ICON_HEIGHT_RATIO = 0.56;

const FULL_WIDTH: Record<LogoSize, number> = {
  xs: 72,
  sm: 108,
  md: 148,
  lg: 200,
  xl: 260,
};

const MARK_SIZE: Record<LogoSize, number> = {
  xs: 22,
  sm: 28,
  md: 34,
  lg: 40,
  xl: 48,
};

interface ConvoInsightLogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  animated?: boolean;
}

function LogoMark({ size }: { size: number }) {
  const width = size;
  const fullHeight = width * LOGO_ASPECT;
  const clipHeight = width * ICON_HEIGHT_RATIO;

  return (
    <View
      style={[
        styles.markClip,
        {
          width,
          height: clipHeight,
          borderRadius: size * 0.16,
        },
      ]}
    >
      <Image
        source={LogoImage}
        style={{ width, height: fullHeight }}
        resizeMode="contain"
        accessibilityLabel="ConvoInsight"
      />
    </View>
  );
}

function AnimatedLogoWrap({
  animated,
  children,
}: {
  animated?: boolean;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [animated, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!animated) {
    return <>{children}</>;
  }

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export function ConvoInsightLogo({
  size = "md",
  variant = "full",
  animated = false,
}: ConvoInsightLogoProps) {
  if (variant === "mark") {
    return (
      <View style={styles.wrap}>
        <LogoMark size={MARK_SIZE[size]} />
      </View>
    );
  }

  if (variant === "header") {
    const mark = MARK_SIZE[size];
    return (
      <View style={styles.headerRow}>
        <LogoMark size={mark} />
        <View style={styles.headerText}>
          <ThemedText type="h4" style={styles.headerTitle} numberOfLines={1}>
            ConvoInsight
          </ThemedText>
          <ThemedText type="caption" style={styles.headerSubtitle} numberOfLines={1}>
            Engine
          </ThemedText>
        </View>
      </View>
    );
  }

  const width = FULL_WIDTH[size];
  const height = width * LOGO_ASPECT;

  return (
    <AnimatedLogoWrap animated={animated}>
      <View style={styles.wrap}>
        <Image
          source={LogoImage}
          style={{ width, height }}
          resizeMode="contain"
          accessibilityLabel="ConvoInsight Engine"
        />
      </View>
    </AnimatedLogoWrap>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  markClip: {
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  headerText: {
    justifyContent: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    fontSize: 10,
    lineHeight: 14,
    marginTop: -1,
  },
});
