import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { lazyScreen } from "@/navigation/lazyScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Upload: undefined;
  Processing: {
    rawText: string;
    chatName: string;
    currentUser: string;
  };
  Chats: undefined;
  ChatDetail: { chatId: string };
  Settings: undefined;
  Main: undefined;
  Dashboard: { chatId: string };
  ImportChat: undefined;
  ChatAnalysis: { chatId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoginScreen = lazyScreen(() => require("@/screens/LoginScreen"));
const AuthFlow = lazyScreen(() => require("@/screens/AuthFlow"));
const ChatsScreen = lazyScreen(() => require("@/screens/ChatsScreen"));
const UploadScreen = lazyScreen(() => require("@/screens/ImportChatScreen"));
const ProcessingScreen = lazyScreen(() => require("@/screens/ProcessingScreen"));
const ChatDetailScreen = lazyScreen(() => require("@/screens/ChatDetailScreen"));
const ProfileScreen = lazyScreen(() => require("@/screens/ProfileScreen"));

interface RootStackNavigatorProps {
  initialLoggedIn: boolean;
}

export default function RootStackNavigator({ initialLoggedIn }: RootStackNavigatorProps) {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerBackTitle: "Back",
      }}
      initialRouteName={initialLoggedIn ? "Chats" : "Login"}
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
        name="Chats"
        component={ChatsScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="Upload"
        component={UploadScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />

      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Settings"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Dashboard"
        component={ChatDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatAnalysis"
        component={ChatDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ImportChat"
        component={UploadScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
