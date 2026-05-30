import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

import Logo from "../../assets/images/ConvoInsight.png";

type Step = "phone" | "password" | "otp" | "username";

export default function AuthFlow({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+92");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState(Array(4).fill(""));
  const [username, setUsername] = useState("");

  const otpRefs = useRef<TextInput[]>([]);

  // --- Step 1: Phone ---
  const handlePhoneNext = () => {
    if (phoneNumber.replace(/\D/g, "").length < 10) {
      Alert.alert("Error", "Enter a valid phone number");
      return;
    }
    setStep("password");
  };

  // --- Step 2: Password ---
  const handlePasswordNext = () => {
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    // app you'd send OTP to the phone here
    setStep("otp");
  };

  // --- Step 3: OTP ---
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpVerify = () => {
    if (!otp.every(Boolean)) {
      Alert.alert("Error", "Enter the complete 4-digit OTP");
      return;
    }
    // In a  app you'd verify the OTP with backend here
    setStep("username");
  };

  // --- Step 4: Username ---
  const handleComplete = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    // Save credentials to AsyncStorage
    await AsyncStorage.setItem("@ConvoInsight_userName", username.trim());
    await AsyncStorage.setItem("@ConvoInsight_userPhone", countryCode + phoneNumber);
    await AsyncStorage.setItem("@ConvoInsight_userPassword", password);
    await AsyncStorage.setItem("@ConvoInsight_isLoggedIn", "true");

    navigation.replace("Main");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: Spacing.lg,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logoImage} />
        </View>

        {/* ── STEP 1: Phone ── */}
        {step === "phone" && (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your phone number to get started
            </ThemedText>

            {/* Country Code Picker */}
            <View style={[styles.pickerWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Picker
                selectedValue={countryCode}
                onValueChange={setCountryCode}
                style={{ color: theme.text }}
              >
                <Picker.Item label="Pakistan (+92)" value="+92" color="#000000" />
                <Picker.Item label="USA (+1)" value="+1" color="#000000" />
                <Picker.Item label="UK (+44)" value="+44" color="#000000" />
                <Picker.Item label="India (+91)" value="+91" color="#000000" />
              </Picker>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
              keyboardType="phone-pad"
              placeholder="3001234567"
              placeholderTextColor={theme.textSecondary}
              value={phoneNumber}
              onChangeText={(v) => setPhoneNumber(v.replace(/\D/g, ""))}
            />

            <Button
              onPress={handlePhoneNext}
              style={{ backgroundColor: theme.primary, marginTop: Spacing.md }}
            >
              Next
            </Button>

            <View style={styles.linkRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Already have an account?{" "}
              </ThemedText>
              <Pressable onPress={() => navigation.navigate("Login")}>
                <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                  Login
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── STEP 2: Password ── */}
        {step === "password" && (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.title}>
              Set Password
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Choose a strong password for your account
            </ThemedText>

            {/* Password */}
            <View style={[styles.inputRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <TextInput
                style={[styles.inputFlex, { color: theme.text }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <ThemedText type="small" style={{ color: theme.primary }}>
                  {showPassword ? "Hide" : "Show"}
                </ThemedText>
              </Pressable>
            </View>

            {/* Confirm Password */}
            <View style={[styles.inputRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, marginTop: Spacing.md }]}>
              <TextInput
                style={[styles.inputFlex, { color: theme.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                <ThemedText type="small" style={{ color: theme.primary }}>
                  {showConfirmPassword ? "Hide" : "Show"}
                </ThemedText>
              </Pressable>
            </View>

            <Button
              onPress={handlePasswordNext}
              style={{ backgroundColor: theme.primary, marginTop: Spacing.lg }}
            >
              Send OTP
            </Button>

            <Pressable onPress={() => setStep("phone")} style={styles.backBtn}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                ← Back
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* ── STEP 3: OTP ── */}
        {step === "otp" && (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.title}>
              Verify OTP
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter the 4-digit code sent to {countryCode} {phoneNumber}
            </ThemedText>

            <View style={styles.otpRow}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { if (r) otpRefs.current[i] = r; }}
                  style={[styles.otpInput, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  onChangeText={(v) => handleOtpChange(i, v)}
                />
              ))}
            </View>

            <Button
              onPress={handleOtpVerify}
              style={{ backgroundColor: theme.primary, marginTop: Spacing.md }}
            >
              Verify
            </Button>

            <Pressable onPress={() => setStep("password")} style={styles.backBtn}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                ← Back
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* ── STEP 4: Username ── */}
        {step === "username" && (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.title}>
              Choose Username
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              This is how your name will appear in the app
            </ThemedText>

            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. John Doe"
              placeholderTextColor={theme.textSecondary}
              value={username}
              onChangeText={setUsername}
            />

            <Button
              onPress={handleComplete}
              style={{ backgroundColor: theme.primary, marginTop: Spacing.md }}
            >
              Complete Setup
            </Button>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoContainer: { alignItems: "center", marginBottom: Spacing["3xl"] },
  logoImage: { width: 120, height: 120, resizeMode: "contain" },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.xl },
  title: { textAlign: "center", marginBottom: Spacing.sm },
  subtitle: { textAlign: "center", marginBottom: Spacing.xl },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
  },
  inputRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  inputFlex: { flex: 1, fontSize: 16, paddingVertical: Spacing.lg },
  eyeBtn: { paddingLeft: Spacing.sm },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  otpInput: {
    flex: 1,
    height: 60,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  backBtn: { alignItems: "center", marginTop: Spacing.lg },
});