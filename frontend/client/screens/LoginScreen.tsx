import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { PhoneAuthForm } from "@/components/PhoneAuthForm";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  isValidPhoneDigits,
  loginWithPhone,
} from "@/lib/auth";

import Logo from "../../assets/images/ConvoInsight.png";

export default function LoginScreen({ navigation }: { navigation: { replace: (s: string) => void; navigate: (s: string) => void } }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [countryCode, setCountryCode] = useState("+92");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!isValidPhoneDigits(phoneDigits)) {
      Alert.alert("Invalid number", "Enter at least 10 digits.");
      return;
    }

    setLoading(true);
    try {
      await loginWithPhone(countryCode, phoneDigits);
      navigation.replace("Upload");
    } catch (e) {
      Alert.alert(
        "Could not sign in",
        e instanceof Error ? e.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.waBar,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: theme.primaryVariant,
          },
        ]}
      >
        <ThemedText type="h4" style={{ color: "#FFFFFF" }}>
          ConvoInsight
        </ThemedText>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logoImage} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={styles.title}>
            Sign in with phone
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            WhatsApp-style login — one tap, no password.
          </ThemedText>

          <PhoneAuthForm
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phoneDigits={phoneDigits}
            onPhoneDigitsChange={setPhoneDigits}
          />

          <Button
            onPress={handleContinue}
            disabled={loading}
            style={{ backgroundColor: theme.primary, marginTop: Spacing.xl }}
          >
            {loading ? "Signing in…" : "Continue"}
          </Button>

          <View style={styles.linkRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              New here?{" "}
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("Signup")}>
              <ThemedText
                type="body"
                style={{ color: theme.primary, fontWeight: "600" }}
              >
                Create account
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  waBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  logoContainer: { alignItems: "center", marginBottom: Spacing["2xl"] },
  logoImage: { width: 100, height: 100, resizeMode: "contain" },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.xl },
  title: { textAlign: "center", marginBottom: Spacing.sm },
  subtitle: { textAlign: "center", marginBottom: Spacing.xl },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
});
