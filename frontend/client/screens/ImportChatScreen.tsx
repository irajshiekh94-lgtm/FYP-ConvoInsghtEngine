import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useChats } from "@/hooks/useChats";
import { useActions } from "@/hooks/useActions";
import { apiRequest } from "@/lib/query-client";
import { Chat, ActionItem } from "@/types";

interface SelectedFile {
  name: string;
  uri: string;
  type: "chat" | "voice";
}

export default function ImportChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addChat } = useChats();
  const { addActions } = useActions();

  const [chatFile, setChatFile] = useState<SelectedFile | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<SelectedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pickChatFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setChatFile({
          name: file.name,
          uri: file.uri,
          type: "chat",
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select file. Please try again.");
    }
  };

  const pickVoiceNotes = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newVoiceNotes = result.assets.map((file) => ({
          name: file.name,
          uri: file.uri,
          type: "voice" as const,
        }));
        setVoiceNotes([...voiceNotes, ...newVoiceNotes]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select voice notes. Please try again.");
    }
  };

  const removeVoiceNote = (index: number) => {
    setVoiceNotes(voiceNotes.filter((_, i) => i !== index));
  };

  const analyzeChat = async () => {
    if (!chatFile) return;

    setIsAnalyzing(true);

    try {
      const chatContent = await FileSystem.readAsStringAsync(chatFile.uri);
      
      const response = await apiRequest("POST", "/api/analyze", {
        chatContent,
        chatName: chatFile.name.replace(".txt", ""),
        voiceNoteCount: voiceNotes.length,
      });

      const analysisResult = await response.json();

      const newChat: Chat = {
        id: Date.now().toString(),
        name: chatFile.name.replace(".txt", ""),
        category: analysisResult.category || "general",
        analyzedAt: new Date().toISOString(),
        summary: analysisResult.summary || "",
        actionCount: analysisResult.actionItems?.length || 0,
        messages: [],
        extractedData: {
          actionItems: analysisResult.actionItems || [],
          businessOrders: analysisResult.businessOrders || [],
          meetings: analysisResult.meetings || [],
          importantMessages: analysisResult.importantMessages || [],
        },
      };

      await addChat(newChat);

      if (analysisResult.actionItems?.length > 0) {
        const actionItems: ActionItem[] = analysisResult.actionItems.map(
          (item: any, index: number) => ({
            id: `${newChat.id}_action_${index}`,
            chatId: newChat.id,
            chatName: newChat.name,
            content: item.content,
            type: item.type || "task",
            urgency: item.urgency || "medium",
            dueDate: item.dueDate,
            completed: false,
            createdAt: new Date().toISOString(),
          })
        );
        await addActions(actionItems);
      }

      navigation.goBack();
      setTimeout(() => {
        navigation.navigate("ChatAnalysis", { chatId: newChat.id });
      }, 100);
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert(
        "Analysis Failed",
        "Failed to analyze the chat. Please check your connection and try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View
          style={[
            styles.instructionsCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.instructionsHeader}>
            <Feather name="info" size={20} color={theme.primary} />
            <ThemedText type="h4">How to Export WhatsApp Chat</ThemedText>
          </View>
          <View style={styles.instructionsList}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              1. Open the WhatsApp chat you want to analyze
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              2. Tap the three dots menu and select "More"
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              3. Select "Export chat" and choose "Without media"
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              4. Save the .txt file to your device
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Chat File
          </ThemedText>
          {chatFile ? (
            <View
              style={[
                styles.selectedFile,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.fileInfo}>
                <Feather name="file-text" size={24} color={theme.primary} />
                <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>
                  {chatFile.name}
                </ThemedText>
              </View>
              <Pressable onPress={() => setChatFile(null)}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                styles.uploadButton,
                { borderColor: theme.primary, backgroundColor: theme.backgroundDefault },
              ]}
              onPress={pickChatFile}
            >
              <Feather name="upload" size={24} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary }}>
                Select Chat File (.txt)
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Voice Notes (Optional)</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Will be transcribed
            </ThemedText>
          </View>
          {voiceNotes.length > 0 ? (
            <View style={styles.voiceNotesList}>
              {voiceNotes.map((note, index) => (
                <View
                  key={index}
                  style={[
                    styles.selectedFile,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <View style={styles.fileInfo}>
                    <Feather name="mic" size={20} color={theme.primary} />
                    <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                      {note.name}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => removeVoiceNote(index)}>
                    <Feather name="x" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            style={[
              styles.addButton,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={pickVoiceNotes}
          >
            <Feather name="plus" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary }}>
              Add Voice Notes
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.analyzeSection}>
          <Button
            onPress={analyzeChat}
            disabled={!chatFile || isAnalyzing}
            style={{ backgroundColor: theme.primary }}
          >
            {isAnalyzing ? (
              <View style={styles.loadingButton}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: Spacing.sm }}>
                  Analyzing...
                </ThemedText>
              </View>
            ) : (
              "Analyze Chat"
            )}
          </Button>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  instructionsList: {
    gap: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  selectedFile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  voiceNotesList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  analyzeSection: {
    marginTop: Spacing.lg,
  },
  loadingButton: {
    flexDirection: "row",
    alignItems: "center",
  },
});
