import React from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export type OtpStep = "email" | "otp";

interface EmailOtpAuthFormProps {
  step: OtpStep;
  email: string;
  onEmailChange: (email: string) => void;
  otp: string;
  onOtpChange: (otp: string) => void;
  displayName?: string;
  onDisplayNameChange?: (name: string) => void;
  showDisplayName?: boolean;
  onChangeEmail?: () => void;
}

export function EmailOtpAuthForm({
  step,
  email,
  onEmailChange,
  otp,
  onOtpChange,
  displayName = "",
  onDisplayNameChange,
  showDisplayName = false,
  onChangeEmail,
}: EmailOtpAuthFormProps) {
  const { theme } = useTheme();

  if (step === "otp") {
    return (
      <View style={styles.wrap}>
        <View style={[styles.sentBanner, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Code sent to{" "}
            <ThemedText type="small" style={{ fontWeight: "700", color: theme.text }}>
              {email}
            </ThemedText>
          </ThemedText>
          {onChangeEmail ? (
            <Pressable onPress={onChangeEmail} hitSlop={8}>
              <ThemedText
                type="link"
                style={{ color: theme.primary, textAlign: "center", marginTop: Spacing.xs }}
              >
                Change email
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Verification code
        </ThemedText>
        <TextInput
          style={[
            styles.otpInput,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="6-digit code"
          placeholderTextColor={theme.textSecondary}
          value={otp}
          onChangeText={(v) => onOtpChange(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showDisplayName && onDisplayNameChange ? (
        <>
          <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
            Display name (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="How we greet you"
            placeholderTextColor={theme.textSecondary}
            value={displayName}
            onChangeText={onDisplayNameChange}
            autoCapitalize="words"
          />
        </>
      ) : null}

      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Email address
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholder="you@example.com"
        placeholderTextColor={theme.textSecondary}
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs, lineHeight: 18 }}>
        We&apos;ll email you a verification code.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  label: { marginBottom: Spacing.xs, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  sentBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
});
