import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { transcribeVoiceNoteFile } from "@/lib/api-client";

interface SelectedFile {
  name: string;
  uri: string;
  type: "chat" | "voice";
}

function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    m4a: "audio/m4a",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    opus: "audio/opus",
    webm: "audio/webm",
    aac: "audio/aac",
  };
  return map[ext || ""] || "audio/m4a";
}

export default function ImportChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [chatFile, setChatFile] = useState<SelectedFile | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<SelectedFile[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [whatsAppName, setWhatsAppName] = useState("Me");

  useEffect(() => {
    AsyncStorage.getItem("@ConvoInsight_whatsAppName").then((saved) => {
      if (saved) setWhatsAppName(saved);
      else {
        AsyncStorage.getItem("@ConvoInsight_userName").then((name) => {
          if (name) setWhatsAppName(name);
        });
      }
    });
  }, []);

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
    } catch {
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
        setVoiceNotes((prev) => [...prev, ...newVoiceNotes]);
      }
    } catch {
      Alert.alert("Error", "Failed to select voice notes. Please try again.");
    }
  };

  const removeVoiceNote = (index: number) => {
    setVoiceNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const startProcessing = async () => {
    if (!chatFile) return;

    setIsPreparing(true);
    try {
      let chatContent = await FileSystem.readAsStringAsync(chatFile.uri);
      const chatName = chatFile.name.replace(/\.txt$/i, "");
      const userName = whatsAppName.trim() || "Me";

      if (voiceNotes.length > 0) {
        for (let i = 0; i < voiceNotes.length; i++) {
          const note = voiceNotes[i];
          const text = await transcribeVoiceNoteFile(
            note.uri,
            note.name,
            guessMimeType(note.name)
          );
          chatContent += `\n\n[Voice note: ${note.name}]\n${text}`;
        }
      }

      if (!chatContent.trim()) {
        throw new Error("Chat file is empty");
      }

      await AsyncStorage.setItem("@ConvoInsight_whatsAppName", userName);

      navigation.replace("Processing", {
        rawText: chatContent,
        chatName,
        currentUser: userName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not read file";
      Alert.alert("Upload failed", message);
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.banner,
          {
            paddingTop: insets.top + Spacing.lg,
            backgroundColor: theme.primaryVariant,
          },
        ]}
      >
        <Feather name="message-circle" size={28} color="#FFFFFF" />
        <View style={styles.bannerText}>
          <ThemedText type="h3" style={styles.bannerTitle}>
            Import WhatsApp chat
          </ThemedText>
          <ThemedText type="body" style={styles.bannerSubtitle}>
            Convert chat exports into action items, priorities, and team-ready insights.
          </ThemedText>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.card}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Your chat identity
          </ThemedText>
          <ThemedText type="caption" style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>            
            Enter the name shown in your WhatsApp export so insights map correctly to your messages.
          </ThemedText>
          <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: theme.backgroundRoot,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={whatsAppName}
            onChangeText={setWhatsAppName}
            placeholder="As shown in export (e.g. You)"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            editable={!isPreparing}
          />
        </Card>

        <Card style={styles.card}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Upload export
          </ThemedText>
          <ThemedText type="caption" style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>            
            Choose a WhatsApp chat export (.txt) without media to start analysis.
          </ThemedText>
          {chatFile ? (
            <View
              style={[
                styles.fileChip,
                { backgroundColor: theme.chatBubbleSent },
              ]}
            >
              <Feather name="file-text" size={22} color={theme.primaryVariant} />
              <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>
                {chatFile.name}
              </ThemedText>
              {!isPreparing ? (
                <Pressable onPress={() => setChatFile(null)} hitSlop={8}>
                  <Feather name="x" size={20} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={[
                styles.dropZone,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.backgroundRoot,
                },
              ]}
              onPress={pickChatFile}
              disabled={isPreparing}
            >
              <View
                style={[
                  styles.dropIcon,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <Feather name="upload-cloud" size={32} color={theme.primary} />
              </View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Select your chat export
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                WhatsApp → Chat → ⋮ → Export chat → Without media
              </ThemedText>
            </Pressable>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="h4">Voice notes</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Optional
            </ThemedText>
          </View>
          {voiceNotes.map((note, index) => (
            <View
              key={`${note.name}-${index}`}
              style={[
                styles.fileChip,
                { backgroundColor: theme.backgroundRoot },
              ]}
            >
              <Feather name="mic" size={18} color={theme.primary} />
              <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                {note.name}
              </ThemedText>
              {!isPreparing ? (
                <Pressable onPress={() => removeVoiceNote(index)}>
                  <Feather name="x" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ))}
          <Pressable
            style={[styles.addVoice, { backgroundColor: theme.backgroundDefault }]}
            onPress={pickVoiceNotes}
            disabled={isPreparing}
          >
            <Feather name="plus" size={18} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary }}>
              Add voice note
            </ThemedText>
          </Pressable>
        </Card>

        <Button
          onPress={startProcessing}
          disabled={!chatFile || isPreparing}
          style={styles.submitButton}
        >
          {isPreparing ? "Preparing…" : "Continue to analysis"}
        </Button>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  bannerSubtitle: {
    color: "#FFFFFFCC",
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  nameInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  dropZone: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  dropIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  addVoice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
