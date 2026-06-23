import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FaceScreen } from '../screens/FaceScreen';

export type RootStackParamList = {
  Face: undefined;
  // We can add settings and debug screens here in future phases
};

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Face"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000000' },
      }}
    >
      <Stack.Screen name="Face" component={FaceScreen} />
    </Stack.Navigator>
  );
};
