import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export type UploadStep = {
  id: string;
  label: string;
};

type StepState = "pending" | "active" | "done";

interface UploadProgressProps {
  steps: UploadStep[];
  currentStepId: string;
}

function stepState(
  steps: UploadStep[],
  stepId: string,
  currentStepId: string
): StepState {
  const currentIdx = steps.findIndex((s) => s.id === currentStepId);
  const stepIdx = steps.findIndex((s) => s.id === stepId);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function UploadProgress({ steps, currentStepId }: UploadProgressProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault },
      ]}
    >
      {steps.map((step, index) => {
        const state = stepState(steps, step.id, currentStepId);
        const isLast = index === steps.length - 1;

        const dotColor =
          state === "done"
            ? theme.success
            : state === "active"
            ? theme.primary
            : theme.border;

        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: dotColor }]}>
                {state === "done" ? (
                  <Feather name="check" size={12} color="#FFFFFF" />
                ) : state === "active" ? (
                  <View style={[styles.pulse, { backgroundColor: theme.primary }]} />
                ) : null}
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        state === "done" ? theme.success : theme.border,
                    },
                  ]}
                />
              ) : null}
            </View>
            <ThemedText
              type="small"
              style={{
                color:
                  state === "active"
                    ? theme.text
                    : state === "done"
                    ? theme.textSecondary
                    : theme.textSecondary,
                fontWeight: state === "active" ? "600" : "400",
                flex: 1,
              }}
            >
              {step.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 36,
  },
  timeline: {
    width: 28,
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 14,
    marginVertical: 2,
  },
});
