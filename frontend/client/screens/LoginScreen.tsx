import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
import { EmailOtpAuthForm } from "@/components/auth/EmailOtpAuthForm";
import { useEmailOtpAuth } from "@/hooks/useEmailOtpAuth";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export default function LoginScreen({
  navigation,
}: {
  navigation: { replace: (s: string) => void; navigate: (s: string) => void };
}) {
  const { theme } = useTheme();
  const auth = useEmailOtpAuth({
    purpose: "login",
    onSuccess: () => navigation.replace("Chats"),
    onNavigateToSignup: () => navigation.navigate("Signup"),
  });

  return (
    <AuthScreenLayout
      title="Welcome back"
      subtitle="Sign in with your email address."
      footer={
        <View style={styles.linkRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            New here?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Signup")}>
            <ThemedText type="link" style={{ color: theme.primary, fontWeight: "600" }}>
              Create account
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
