import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Brand } from '@/constants/theme';

// Simple dot icon so the tab bar needs no icon-font dependency yet.
function Dot({ color }: { color: ColorValue }) {
  return (
    <View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.red,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="deck"
        options={{ title: 'Deck', tabBarIcon: ({ color }) => <Dot color={color} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Matches', tabBarIcon: ({ color }) => <Dot color={color} /> }}
      />
      <Tabs.Screen
        name="you"
        options={{ title: 'You', tabBarIcon: ({ color }) => <Dot color={color} /> }}
      />
    </Tabs>
  );
}
