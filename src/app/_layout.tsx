import 'react-native-url-polyfill/auto';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Root navigator. For now it starts at `index` which redirects to the welcome
// flow. Once auth lands (next build step), this is where we'll read the Supabase
// session and route to (onboarding) vs (tabs).
// DESIGN.md: dark is the default base mode (flip to system later).
export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="chat/[matchId]" options={{ headerShown: true, title: 'Chat' }} />
        <Stack.Screen name="about" options={{ headerShown: true, title: 'About' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
