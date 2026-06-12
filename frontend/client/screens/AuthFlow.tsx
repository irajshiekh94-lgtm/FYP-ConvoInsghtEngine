import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
import { EmailOtpAuthForm } from "@/components/auth/EmailOtpAuthForm";
import { useEmailOtpAuth } from "@/hooks/useEmailOtpAuth";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export default function AuthFlow({
  navigation,
}: {
  navigation: { replace: (s: string) => void; navigate: (s: string) => void };
}) {
  const { theme } = useTheme();
  const [displayName, setDisplayName] = useState("");

  const auth = useEmailOtpAuth({
    purpose: "signup",
    displayName,
    onSuccess: () => navigation.replace("Upload"),
    onNavigateToLogin: () => navigation.navigate("Login"),
  });

  return (
    <AuthScreenLayout
      title="Create your account"
      subtitle="Verify your email to get started."
      footer={
        <View style={styles.linkRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Already have an account?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <ThemedText type="link" style={{ color: theme.primary, fontWeight: "600" }}>
              Sign in
            </ThemedText>
          </Pressable>
        </View>
      }
    >
      <EmailOtpAuthForm
        step={auth.step}
        email={auth.email}
        onEmailChange={auth.setEmail}
        otp={auth.otp}
        onOtpChange={auth.setOtp}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        showDisplayName={auth.step === "email"}
        onChangeEmail={auth.resetToEmail}
      />

      <Button
        onPress={auth.primaryAction}
        disabled={auth.loading}
        loading={auth.loading}
        style={{ marginTop: Spacing.xl }}
      >
        {auth.primaryLabel}
      </Button>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
    flexWrap: "wrap",
  },
});
