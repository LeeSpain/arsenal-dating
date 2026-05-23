import { Redirect, Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Brand } from '@/constants/theme';
import { useSession } from '@/lib/session';

// Simple dot icon so the tab bar needs no icon-font dependency yet.
function Dot({ color }: { color: ColorValue }) {
  return (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
  );
}

export default function TabsLayout() {
  const { session, loading } = useSession();

  if (loading) return null;
  if (!session) return <Redirect href="/welcome" />;
  // Step 2 guards on session only. Onboarding-completion gating is added in step 3.

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
