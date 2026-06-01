import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { UploadProgress, type UploadStep } from "@/components/UploadProgress";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ProcessingOverlayProps {
  visible: boolean;
  statusMessage: string;
  steps: UploadStep[];
  currentStepId: string;
}

export function ProcessingOverlay({
  visible,
  statusMessage,
  steps,
  currentStepId,
}: ProcessingOverlayProps) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <Animated.View style={{ opacity: pulse, marginBottom: Spacing.lg }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </Animated.View>

          <ThemedText type="h3" style={styles.headline}>
            {statusMessage}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.lg }}
          >
            ConvoInsight is turning your chat into actionable insights
          </ThemedText>

          <UploadProgress steps={steps} currentStepId={currentStepId} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
});
