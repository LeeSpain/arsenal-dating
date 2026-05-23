import 'react-native-url-polyfill/auto';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SessionProvider } from '@/lib/session';

// Root navigator. `index` routes by session state. DESIGN.md: dark default.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="chat/[matchId]" options={{ headerShown: true, title: 'Chat' }} />
          <Stack.Screen name="about" options={{ headerShown: true, title: 'About' }} />
          <Stack.Screen
            name="legal/privacy"
            options={{ headerShown: true, title: 'Privacy Policy' }}
          />
          <Stack.Screen
            name="legal/terms"
            options={{ headerShown: true, title: 'Terms of Use' }}
          />
          <Stack.Screen
            name="admin/kit-review"
            options={{ headerShown: true, title: 'Kit review' }}
          />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
