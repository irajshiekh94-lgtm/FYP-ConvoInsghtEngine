import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import UploadScreen from "@/screens/ImportChatScreen";
import ProcessingScreen from "@/screens/ProcessingScreen";
import DashboardScreen from "@/screens/ChatAnalysisScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import AuthFlow from "@/screens/AuthFlow";
import LoginScreen from "@/screens/LoginScreen";
import { isLoggedIn } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  /** Linear flow: login → upload → processing → dashboard */
  Upload: undefined;
  Processing: {
    rawText: string;
    chatName: string;
    currentUser: string;
  };
  Dashboard: { chatId: string };
  /** History & settings after first analysis */
  Main: undefined;
  /** @deprecated use Upload — kept for FAB deep links */
  ImportChat: undefined;
  /** @deprecated use Dashboard */
  ChatAnalysis: { chatId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { theme } = useTheme();
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    isLoggedIn()
      .then(setLoggedIn)
      .finally(() => setAuthReady(true));
  }, []);

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerBackTitle: "Back",
      }}
      initialRouteName={loggedIn ? "Main" : "Login"}
      id="RootStack"
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="Signup"
        component={AuthFlow}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: "Insights",
          gestureEnabled: false,
          ...opaqueScreenOptions,
        }}
      />

      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ImportChat"
        component={UploadScreen}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          headerTitle: "Import Chat",
          ...opaqueScreenOptions,
        }}
      />

      <Stack.Screen
        name="ChatAnalysis"
        component={DashboardScreen}
        options={{
          headerTitle: "Analysis",
          animation: "slide_from_right",
          ...opaqueScreenOptions,
        }}
      />
    </Stack.Navigator>
  );
}
