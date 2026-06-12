import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { UploadProgress, type UploadStep } from "@/components/UploadProgress";
import { Surface } from "@/components/ui/Surface";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { runAnalysisWithProgress } from "@/lib/run-analysis-with-progress";
import { transformJobResultToChat } from "@/lib/transform-analysis";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";
import { useSettings } from "@/hooks/useSettings";
import {
  countUrgentMessages,
  presentUrgentNotification,
} from "@/lib/urgent-notifications";

type ProcessingRoute = RouteProp<RootStackParamList, "Processing">;

const STEPS: UploadStep[] = [
  { id: "uploading", label: "Uploading chat" },
  { id: "parsing", label: "Parsing messages" },
  { id: "analyzing", label: "Analyzing insights" },
  { id: "done", label: "Complete" },
];

export default function ProcessingScreen() {
  const { theme } = useTheme();
  const route = useRoute<ProcessingRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats, addChat } = useChats();
  const { addActions } = useActions();
  const { settings } = useSettings();

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

        if (settings.urgentAlertsEnabled) {
          const totalUrgent = countUrgentMessages([chat, ...chats]);
          if (totalUrgent > 0) {
            await presentUrgentNotification(totalUrgent);
          }
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "Chats" }],
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Analysis failed";
        Alert.alert("Analysis failed", message, [
          { text: "Back to upload", onPress: () => navigation.replace("Upload") },
        ]);
      }
    })();

    return () => { cancelled = true; };
  }, [rawText, chatName, currentUser, chats, settings.urgentAlertsEnabled, addChat, addActions, navigation]);

  const isAnalyzing = step === "analyzing";

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="h3" style={styles.title}>
          {statusMessage}
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {chatName}
        </ThemedText>

        <Surface style={styles.progressCard} elevated>
          <UploadProgress steps={STEPS} currentStepId={step} />
        </Surface>

        {isAnalyzing ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Large chats may take a few minutes. Keep the app open.
          </ThemedText>
        ) : null}
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
    alignItems: "center",
  },
  title: { textAlign: "center", marginBottom: Spacing.xs },
  subtitle: { textAlign: "center", marginBottom: Spacing.xl },
  progressCard: { width: "100%", marginBottom: Spacing.lg },
});
