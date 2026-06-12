import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import ChatsStackNavigator from "@/navigation/ChatsStackNavigator";
import ActionsStackNavigator from "@/navigation/ActionsStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows } from "@/constants/theme";
import { FAB_SIZE, FAB_OFFSET } from "@/constants/layout";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export type MainTabParamList = {
  HomeTab: undefined;
  ChatsTab: undefined;
  ActionsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function ImportFab() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabBarContentHeight = Platform.OS === "ios" ? 49 : 56;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.fabContainer, { bottom: tabBarContentHeight + insets.bottom + FAB_OFFSET }]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          Shadows.lg,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        onPress={() => navigation.navigate("Upload")}
        accessibilityLabel="Import WhatsApp chat"
        accessibilityRole="button"
      >
        <Feather name="plus" size={26} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <View style={styles.root}>
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: tabBarHeight,
            paddingTop: Spacing.xs,
            paddingBottom: insets.bottom + Spacing.xs,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.divider,
            borderTopWidth: StyleSheet.hairlineWidth,
            elevation: 0,
            shadowOpacity: isDark ? 0 : 0.06,
            shadowOffset: { width: 0, height: -2 },
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 2,
          },
          headerShown: false,
          lazy: true,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            title: "Insights",
            tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="ChatsTab"
          component={ChatsStackNavigator}
          options={{
            title: "Chats",
            tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="ActionsTab"
          component={ActionsStackNavigator}
          options={{
            title: "Tasks",
            tabBarIcon: ({ color, size }) => <Feather name="check-square" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
      <ImportFab />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fabContainer: { position: "absolute", right: Spacing.lg, zIndex: 100 },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
