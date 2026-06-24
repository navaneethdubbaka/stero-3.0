import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { FaceScreen } from '../screens/FaceScreen';
import { ManualControlScreen } from '../screens/ManualControlScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SerialTestScreen } from '../screens/SerialTestScreen';

export type RootStackParamList = {
  Home: undefined;
  Face: undefined;
  ManualControl: undefined;
  Settings: undefined;
  SerialTest: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000000' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Face" component={FaceScreen} />
      <Stack.Screen name="ManualControl" component={ManualControlScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SerialTest" component={SerialTestScreen} />
    </Stack.Navigator>
  );
};
