import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { UploadProgress, type UploadStep } from "@/components/UploadProgress";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { runAnalysisWithProgress } from "@/lib/run-analysis-with-progress";
import { transformJobResultToChat } from "@/lib/transform-analysis";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";

type ProcessingRoute = RouteProp<RootStackParamList, "Processing">;

const STEPS: UploadStep[] = [
  { id: "uploading", label: "Uploading" },
  { id: "parsing", label: "Parsing messages" },
  { id: "analyzing", label: "Analyzing insights" },
  { id: "done", label: "Complete" },
];

export default function ProcessingScreen() {
  const { theme } = useTheme();
  const route = useRoute<ProcessingRoute>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addChat } = useChats();
  const { addActions } = useActions();

  const { rawText, chatName, currentUser } = route.params;

  const [step, setStep] = useState("uploading");
  const [statusMessage, setStatusMessage] = useState("Uploading…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const job = await runAnalysisWithProgress(
          { rawText, chatName, currentUser },
          (stepId, message) => {
            if (!cancelled) {
              setStep(stepId);
              setStatusMessage(message);
            }
          }
        );

        if (cancelled) return;

        if (job.status !== "done" || !job.result) {
          throw new Error(job.error || "Analysis did not complete");
        }

        const chat = transformJobResultToChat(job, chatName, currentUser);
        await addChat(chat);

        if (chat.extractedData.actionItems.length > 0) {
          await addActions(chat.extractedData.actionItems);
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "Dashboard", params: { chatId: chat.id } }],
        });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Analysis failed";
        Alert.alert("Analysis failed", message, [
          {
            text: "Back to upload",
            onPress: () => navigation.replace("Upload"),
          },
        ]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawText, chatName, currentUser, addChat, addActions, navigation]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="h3" style={styles.title}>
          {statusMessage}
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Analyzing {chatName}
        </ThemedText>
        <UploadProgress steps={STEPS} currentStepId={step} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  title: { textAlign: "center", marginBottom: Spacing.sm },
  subtitle: { textAlign: "center", marginBottom: Spacing.xl },
});
