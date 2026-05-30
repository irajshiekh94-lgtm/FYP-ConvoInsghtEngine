import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ActionsScreen from "@/screens/ActionsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ActionsStackParamList = {
  Actions: undefined;
};

const Stack = createNativeStackNavigator<ActionsStackParamList>();

export default function ActionsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Actions"
        component={ActionsScreen}
        options={{
          headerTitle: "Action Items",
        }}
      />
    </Stack.Navigator>
  );
}
