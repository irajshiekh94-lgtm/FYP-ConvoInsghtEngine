import { useState, useCallback } from "react";
import { Alert } from "react-native";

import {
  AuthApiError,
  isValidEmail,
  normalizeEmail,
  sendOtp,
  verifyOtpAndLogin,
  type AuthPurpose,
  type StoredUser,
} from "@/lib/auth";
import type { OtpStep } from "@/components/auth/EmailOtpAuthForm";

interface UseEmailOtpAuthOptions {
  purpose: AuthPurpose;
  displayName?: string;
  onSuccess: (user: StoredUser) => void;
  onNavigateToSignup?: () => void;
  onNavigateToLogin?: () => void;
}

export function useEmailOtpAuth({
  purpose,
  displayName,
  onSuccess,
  onNavigateToSignup,
  onNavigateToLogin,
}: UseEmailOtpAuthOptions) {
  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const resetToEmail = useCallback(() => {
    setStep("email");
    setOtp("");
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await sendOtp(email, purpose);
      setStep("otp");
      if (result.devOtp) {
        Alert.alert(
          "Verification code",
          purpose === "signup"
            ? `Email is not configured on the server. Use this code to finish signup:\n\n${result.devOtp}`
            : `Email is not configured on the server. Use this code:\n\n${result.devOtp}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Code sent",
          `Check your inbox at ${normalizeEmail(email)} for the 6-digit code.`,
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      if (e instanceof AuthApiError && e.code === "account_not_found") {
        Alert.alert("Account not found", e.message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign up",
            onPress: () => onNavigateToSignup?.(),
          },
        ]);
        return;
      }
      if (e instanceof AuthApiError && e.code === "account_exists") {
        Alert.alert("Account exists", e.message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log in",
            onPress: () => onNavigateToLogin?.(),
          },
        ]);
        return;
      }
      if (e instanceof AuthApiError && e.code === "email_send_failed") {
        Alert.alert("Email not sent", e.message);
        return;
      }
      if (e instanceof AuthApiError && e.code === "email_not_configured") {
        Alert.alert(
          "Email not configured",
          "The server cannot send verification emails yet. Ask the developer to configure Gmail SMTP."
        );
        return;
      }
      Alert.alert(
        "Could not send code",
        e instanceof Error ? e.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [email, purpose, onNavigateToSignup, onNavigateToLogin]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 6) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const user = await verifyOtpAndLogin(normalizeEmail(email), otp, {
        purpose,
        displayName,
      });
      onSuccess(user);
    } catch (e) {
      if (e instanceof AuthApiError && e.code === "account_not_found") {
        Alert.alert("Account not found", e.message, [
          { text: "Cancel", style: "cancel" },
          { text: "Sign up", onPress: () => onNavigateToSignup?.() },
        ]);
        return;
      }
      Alert.alert(
        "Verification failed",
        e instanceof Error ? e.message : "Invalid or expired code."
      );
    } finally {
      setLoading(false);
    }
  }, [otp, email, purpose, displayName, onSuccess, onNavigateToSignup]);

  const primaryAction = step === "email" ? handleSendOtp : handleVerifyOtp;
  const primaryLabel =
    step === "email"
      ? loading
        ? "Sending code…"
        : "Send verification code"
      : loading
        ? "Verifying…"
        : purpose === "signup"
          ? "Create account"
          : "Verify & continue";

  return {
    step,
    email,
    setEmail,
    otp,
    setOtp,
    loading,
    resetToEmail,
    primaryAction,
    primaryLabel,
  };
}
