import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatsScreen from "@/screens/ChatsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ChatsStackParamList = {
  Chats: undefined;
};

const Stack = createNativeStackNavigator<ChatsStackParamList>();

export default function ChatsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          headerTitle: "Chats",
        }}
      />
    </Stack.Navigator>
  );
}
