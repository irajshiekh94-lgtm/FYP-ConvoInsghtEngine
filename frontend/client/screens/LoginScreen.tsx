import React, { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

import Logo from "../../assets/images/ConvoInsight.png";

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    // Check credentials against saved ones
    const savedPhone = await AsyncStorage.getItem("@ConvoInsight_userPhone");
    const savedPassword = await AsyncStorage.getItem("@ConvoInsight_userPassword");

    // Match phone (strip country code for flexible matching)
    const enteredDigits = phone.replace(/\D/g, "");
    const savedDigits = savedPhone ? savedPhone.replace(/\D/g, "") : "";
    const phoneMatch = savedDigits.endsWith(enteredDigits) || enteredDigits === savedDigits;

    if (phoneMatch && password === savedPassword) {
      await AsyncStorage.setItem("@ConvoInsight_isLoggedIn", "true");
      navigation.replace("Main");
    } else {
      Alert.alert("Login Failed", "Incorrect phone number or password");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: Spacing.lg,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logoImage} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={styles.title}>
            Welcome Back!
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Login with your phone number and password
          </ThemedText>

          {/* Phone Input */}
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
            keyboardType="phone-pad"
            placeholder="Phone number"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ""))}
          />

          {/* Password Input */}
          <View style={[styles.inputRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, marginTop: Spacing.md }]}>
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

          <Button
            onPress={handleLogin}
            style={{ backgroundColor: theme.primary, marginTop: Spacing.lg }}
          >
            Login
          </Button>

          {/* Signup Link */}
          <View style={styles.linkRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Don't have an account?{" "}
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("Signup")}>
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                Sign Up
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
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
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
});