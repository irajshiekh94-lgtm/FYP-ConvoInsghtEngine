import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Switch } from "react-native";
import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";
import { logout, getStoredUser } from "@/lib/auth";

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
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const screen = useTabScreenInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const { settings, updateSettings, clearAllData } = useSettings();
  const navigation = useNavigation<any>();

  const [userName, setUserName] = useState("ConvoInsight User");
  const [userPhone, setUserPhone] = useState("");

  useEffect(() => {
    getStoredUser().then((user) => {
      if (user) {
        setUserName(user.displayName);
        setUserPhone(user.phone);
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
      "This will remove all cached data. Your analyzed chats will remain.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => {} },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently delete all your data including analyzed chats, action items, and settings. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete Everything",
                  style: "destructive",
                  onPress: clearAllData,
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: screen.paddingTop,
        paddingBottom: screen.paddingBottom,
        paddingHorizontal: screen.paddingHorizontal,
      }}
      scrollIndicatorInsets={{ bottom: screen.scrollIndicatorBottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Feather name="user" size={40} color={theme.primary} />
        </View>
        {/* Shows the name entered during signup */}
        <ThemedText type="h3" style={styles.profileName}>
          {userName}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {userPhone || "Manage your settings and preferences"}
        </ThemedText>
      </View>

      <SettingsSection title="NOTIFICATIONS">
        <SettingsToggle
          icon="bell"
          label="Reminders"
          value={settings.remindersEnabled}
          onValueChange={(value) => updateSettings({ remindersEnabled: value })}
        />
        <SettingsToggle
          icon="alert-circle"
          label="Urgent Alerts"
          value={settings.urgentAlertsEnabled}
          onValueChange={(value) =>
            updateSettings({ urgentAlertsEnabled: value })
          }
        />
        <SettingsToggle
          icon="calendar"
          label="Daily Summary"
          value={settings.dailySummaryEnabled}
          onValueChange={(value) =>
            updateSettings({ dailySummaryEnabled: value })
          }
        />
      </SettingsSection>

      <SettingsSection title="APPEARANCE">
        <SettingsToggle
          icon="moon"
          label="Dark Mode"
          value={isDark}
          onValueChange={toggleTheme}
        />
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
        />
        <SettingsRow
          icon="download"
          label="Export Data"
          onPress={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="ACCOUNT">
        <SettingsRow
          icon="log-out"
          label="Logout"
          onPress={handleLogout}
          showArrow={false}
        />
        <SettingsRow
          icon="trash"
          label="Delete All Data"
          onPress={handleDeleteAccount}
          showArrow={false}
          isDestructive
        />
      </SettingsSection>

      <View style={styles.footer}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          ConvoInsight v1.0.0
        </ThemedText>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  profileName: {
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
});