import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ImportChatScreen from "@/screens/ImportChatScreen";
import ChatAnalysisScreen from "@/screens/ChatAnalysisScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import AuthFlow from "@/screens/AuthFlow";
import LoginScreen from "@/screens/LoginScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  ImportChat: undefined;
  ChatAnalysis: { chatId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator 
      screenOptions={screenOptions}
      initialRouteName="Signup"
      id="RootStack"
    >
      {/* AUTH SCREENS */}
      <Stack.Screen
        name="Signup"
        component={AuthFlow}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />

      {/* MAIN APP */}
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ImportChat"
        component={ImportChatScreen}
        options={{
          presentation: "modal",
          headerTitle: "Import Chat",
          ...opaqueScreenOptions,
        }}
      />

      <Stack.Screen
        name="ChatAnalysis"
        component={ChatAnalysisScreen}
        options={{
          headerTitle: "Chat Analysis",
          ...opaqueScreenOptions,
        }}
      />
    </Stack.Navigator>
  );
}