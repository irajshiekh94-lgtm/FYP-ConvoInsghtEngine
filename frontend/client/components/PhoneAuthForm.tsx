import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface PhoneAuthFormProps {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  phoneDigits: string;
  onPhoneDigitsChange: (digits: string) => void;
  displayName?: string;
  onDisplayNameChange?: (name: string) => void;
  showDisplayName?: boolean;
}

export function PhoneAuthForm({
  countryCode,
  onCountryCodeChange,
  phoneDigits,
  onPhoneDigitsChange,
  displayName = "",
  onDisplayNameChange,
  showDisplayName = false,
}: PhoneAuthFormProps) {
  const { theme } = useTheme();

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
                marginBottom: Spacing.md,
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
        Phone number
      </ThemedText>
      <View style={[styles.phoneRow, { borderColor: theme.border }]}>
        <View
          style={[
            styles.pickerWrap,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Picker
            selectedValue={countryCode}
            onValueChange={onCountryCodeChange}
            style={{ color: theme.text, width: 130 }}
          >
            <Picker.Item label="🇵🇰 +92" value="+92" />
            <Picker.Item label="🇺🇸 +1" value="+1" />
            <Picker.Item label="🇬🇧 +44" value="+44" />
            <Picker.Item label="🇮🇳 +91" value="+91" />
          </Picker>
        </View>
        <TextInput
          style={[styles.phoneInput, { color: theme.text }]}
          keyboardType="phone-pad"
          placeholder="300 1234567"
          placeholderTextColor={theme.textSecondary}
          value={phoneDigits}
          onChangeText={(v) => onPhoneDigitsChange(v.replace(/\D/g, ""))}
          maxLength={15}
        />
      </View>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
        No OTP required in demo mode — tap continue to sign in.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  phoneRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    alignItems: "center",
  },
  pickerWrap: {
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.08)",
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
