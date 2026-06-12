import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AppHeader } from "@/components/ui/AppHeader";
import { ConvoInsightLogo } from "@/components/brand/ConvoInsightLogo";
import { useChats } from "@/hooks/useChats";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";
import { logout, getStoredUser } from "@/lib/auth";
import {
  clearUrgentNotifications,
  ensureNotificationPermissions,
} from "@/lib/urgent-notifications";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText
        type="caption"
        style={[styles.sectionTitle, { color: theme.textSecondary }]}
      >
        {title}
      </ThemedText>
      <View
        style={[
          styles.sectionContent,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  isDestructive = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  isDestructive?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.settingsRow, { borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.settingsRowLeft}>
        <Feather
          name={icon}
          size={20}
          color={isDestructive ? theme.error : theme.text}
        />
        <ThemedText
          type="body"
          style={[isDestructive && { color: theme.error }]}
        >
          {label}
        </ThemedText>
      </View>
      <View style={styles.settingsRowRight}>
        {value ? (
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {value}
          </ThemedText>
        ) : null}
        {showArrow ? (
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        ) : null}
      </View>
    </Pressable>
  );
}

function SettingsToggle({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.settingsRow, { borderBottomColor: theme.border }]}>
      <View style={styles.settingsRowLeft}>
        <Feather name={icon} size={20} color={theme.text} />
        <ThemedText type="body">{label}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.backgroundSecondary, true: theme.primary }}
        thumbColor={theme.onPrimary}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const screen = {
    paddingTop: Spacing.md,
    paddingBottom: insets.bottom + Spacing.xl,
    paddingHorizontal: Spacing.lg,
    scrollIndicatorBottom: insets.bottom,
  };
  const { theme, themePreference, setThemePreference } = useTheme();

  const themeLabels: Record<ThemePreference, string> = {
    light: "Light",
    dark: "Dark",
  };

  const handleThemeSelect = (label: string) => {
    void setThemePreference(label === "Dark" ? "dark" : "light");
  };
  const { settings, updateSettings } = useSettings();
  const { clearSummaryCache } = useChats();
  const navigation = useNavigation<any>();

  const [userName, setUserName] = useState("ConvoInsight User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    getStoredUser().then((user) => {
      if (user) {
        setUserName(user.displayName);
        setUserEmail(user.email);
      }
    });
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          let root = navigation;
          while (root.getParent()) {
            root = root.getParent();
          }
          root.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }],
            })
          );
        },
      },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This removes generated summaries and other cached data. Your analyzed chats and action items will remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearSummaryCache();
            Alert.alert("Cache cleared", "Cached summaries have been removed.");
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <AppHeader
        title="Settings"
        onBack={() =>
          navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Chats")
        }
      />
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: screen.paddingTop,
          paddingBottom: screen.paddingBottom,
          paddingHorizontal: screen.paddingHorizontal,
        }}
        scrollIndicatorInsets={{ bottom: screen.scrollIndicatorBottom }}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.profileHeader}>
        <ConvoInsightLogo size="md" />
        <ThemedText type="h3" style={styles.profileName}>
          {userName}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {userEmail || "Manage your settings and preferences"}
        </ThemedText>
      </View>

      <SettingsSection title="NOTIFICATIONS">
        <SettingsToggle
          icon="alert-circle"
          label="Urgent Alerts"
          value={settings.urgentAlertsEnabled}
          onValueChange={async (value) => {
            if (value) {
              const granted = await ensureNotificationPermissions();
              if (!granted) {
                Alert.alert(
                  "Notifications blocked",
                  "Allow notifications in your device settings to receive urgent message alerts."
                );
                return;
              }
            } else {
              await clearUrgentNotifications();
            }
            updateSettings({ urgentAlertsEnabled: value });
          }}
        />
      </SettingsSection>

      <SettingsSection title="APPEARANCE">
        <View style={styles.appearanceRow}>
          <View style={styles.settingsRowLeft}>
            <Feather name="moon" size={20} color={theme.text} />
            <ThemedText type="body">Theme</ThemedText>
          </View>
        </View>
        <View style={styles.themePicker}>
          <SegmentedControl
            options={["Light", "Dark"]}
            selected={themeLabels[themePreference]}
            onSelect={handleThemeSelect}
            style={styles.themePickerControl}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="DATA & PRIVACY">
        <SettingsRow
          icon="database"
          label="Data Retention"
          value={settings.dataRetentionDays + " days"}
          onPress={() => {}}
        />
        <SettingsRow
          icon="trash-2"
          label="Clear Cache"
          onPress={handleClearCache}
          showArrow={false}
        />
      </SettingsSection>

      <SettingsSection title="ACCOUNT">
        <SettingsRow
          icon="log-out"
          label="Logout"
          onPress={handleLogout}
          showArrow={false}
        />
      </SettingsSection>

      <View style={styles.footer}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          ConvoInsight v1.0.0
        </ThemedText>
      </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  profileName: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionContent: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  appearanceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  themePicker: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  themePickerControl: {
    marginBottom: 0,
  },
});