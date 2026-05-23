// Supabase client for Arsenal Dating.
// Uses the PUBLIC publishable key from EXPO_PUBLIC_* env — safe to ship in the
// app bundle. Never put the DB password or a secret key here.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
  );
}

// SSR/prerender-safe storage: AsyncStorage on native and in the browser (where
// it uses localStorage); an in-memory no-op when there is no `window` (web
// rendered in Node), so client init never reaches for window during a build.
const memoryStore = new Map<string, string>();
const ssrSafeStorage = {
  getItem: async (key: string) => memoryStore.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    memoryStore.set(key, value);
  },
  removeItem: async (key: string) => {
    memoryStore.delete(key);
  },
};
const isBrowser = typeof window !== 'undefined';
const storage =
  Platform.OS === 'web' && !isBrowser ? ssrSafeStorage : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // Native apps don't get the session from a URL; web OTP/magic-link would,
    // but only in a real browser (never during a Node build).
    detectSessionInUrl: Platform.OS === 'web' && isBrowser,
  },
});

// Keep the auth token fresh while the app is in the foreground (native only).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
