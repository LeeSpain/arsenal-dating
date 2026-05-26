import 'react-native-url-polyfill/auto';

// Import per-weight subpaths (not the barrel) so Metro bundles only the 7
// weights we use, instead of every Thin–Black + italic face.
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, FontFamily } from '@/constants/theme';
import { SessionProvider } from '@/lib/session';

// Keep the splash up until the brand fonts are ready, so the UI never flashes
// in a system fallback first (DESIGN.md §Typography: Archivo + Inter).
SplashScreen.preventAutoHideAsync();

// Root navigator. `index` routes by session state. DESIGN.md: dark default.
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Don't render the tree until fonts resolve (loaded or failed); on failure we
  // still proceed so the app is never blocked by a font CDN hiccup.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              // Nav chrome follows DESIGN.md: dark surfaces, Archivo titles,
              // and a dark scene background so web never flashes white.
              headerStyle: { backgroundColor: Colors.dark.background },
              headerTitleStyle: { fontFamily: FontFamily.display },
              headerTintColor: Colors.dark.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: Colors.dark.background },
            }}
          >
          <Stack.Screen name="chat/[matchId]" options={{ headerShown: false }} />
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
          <Stack.Screen
            name="admin/reports"
            options={{ headerShown: true, title: 'Reports' }}
          />
          <Stack.Screen
            name="admin/messages"
            options={{ headerShown: true, title: 'Messages' }}
          />
          <Stack.Screen name="blocked" options={{ headerShown: true, title: 'Blocked' }} />
          <Stack.Screen name="suspended" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: true, title: 'Forgot password' }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ headerShown: true, title: 'Reset password' }}
          />
          <Stack.Screen
            name="change-password"
            options={{ headerShown: true, title: 'Change password' }}
          />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
