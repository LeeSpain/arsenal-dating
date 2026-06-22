import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

// Admin-only theming. Deliberately scoped to /admin so the global Colors.dark
// stays the single source of truth for every user-facing screen — flipping
// themes here cannot bleed into welcome / deck / chat / settings.

export type AdminThemeName = 'white' | 'dark' | 'arsenal';

export type AdminThemeTokens = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentText: string;
  attention: string;
  gold: string;
  navItemSelectedBg: string;
  navItemSelectedText: string;
};

export const ADMIN_THEMES: Record<AdminThemeName, AdminThemeTokens> = {
  white: {
    bg: '#FFFFFF',
    surface: '#F5F6F8',
    surfaceRaised: '#ECEEF1',
    text: '#16181C',
    textSecondary: '#5A6068',
    border: '#E1E4E8',
    accent: '#DB0007',
    accentText: '#FFFFFF',
    attention: '#DB0007',
    gold: '#9C824A',
    navItemSelectedBg: '#ECEEF1',
    navItemSelectedText: '#16181C',
  },
  // Softer charcoal slate — clearly lighter than Colors.dark.background (#0E0F12).
  dark: {
    bg: '#1E2128',
    surface: '#262A33',
    surfaceRaised: '#2F3340',
    text: '#ECEEF2',
    textSecondary: '#9097A1',
    border: '#3A3F4A',
    accent: '#EF0107',
    accentText: '#FFFFFF',
    attention: '#EF0107',
    gold: '#B39867',
    navItemSelectedBg: '#2F3340',
    navItemSelectedText: '#ECEEF2',
  },
  // Bold club look — red as the selected nav fill, gold accents.
  arsenal: {
    bg: '#0E0F12',
    surface: '#16181C',
    surfaceRaised: '#2A1216',
    text: '#FFFFFF',
    textSecondary: '#A8ADB5',
    border: '#2E3238',
    accent: '#EF0107',
    accentText: '#FFFFFF',
    attention: '#EF0107',
    gold: '#C9A95E',
    navItemSelectedBg: '#EF0107',
    navItemSelectedText: '#FFFFFF',
  },
};

const STORAGE_KEY = 'arsenal-admin-theme';
const DEFAULT_THEME: AdminThemeName = 'dark';

function readStored(): AdminThemeName {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const v = window.localStorage?.getItem(STORAGE_KEY);
    if (v === 'white' || v === 'dark' || v === 'arsenal') return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

function writeStored(name: AdminThemeName) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(STORAGE_KEY, name);
  } catch {
    /* ignore — quota / privacy mode */
  }
}

type Ctx = {
  name: AdminThemeName;
  tokens: AdminThemeTokens;
  setName: (n: AdminThemeName) => void;
};

const AdminThemeContext = createContext<Ctx | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  // Lazy-init from localStorage so we never paint with the wrong theme on
  // first render (avoids a default→stored flash).
  const [name, setNameState] = useState<AdminThemeName>(() => readStored());

  const setName = useCallback((n: AdminThemeName) => {
    setNameState(n);
    writeStored(n);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ name, tokens: ADMIN_THEMES[name], setName }),
    [name, setName],
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme(): Ctx {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error('useAdminTheme must be used inside <AdminThemeProvider>');
  return ctx;
}

/**
 * Compact 3-button segmented control: White · Dark · Arsenal.
 * Current selection takes the accent border + filled bg.
 */
export function ThemeSwitcher() {
  const { name, tokens, setName } = useAdminTheme();
  const options: { key: AdminThemeName; label: string }[] = [
    { key: 'white', label: 'White' },
    { key: 'dark', label: 'Dark' },
    { key: 'arsenal', label: 'Arsenal' },
  ];

  return (
    <View
      style={[
        styles.switcher,
        { backgroundColor: tokens.surface, borderColor: tokens.border },
      ]}
    >
      {options.map((opt, i) => {
        const selected = opt.key === name;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setName(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${opt.label} theme`}
            style={[
              styles.option,
              i > 0 && { borderLeftWidth: 1, borderLeftColor: tokens.border },
              selected && { backgroundColor: tokens.accent },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.optionLabel,
                { color: selected ? tokens.accentText : tokens.textSecondary },
                selected && styles.optionLabelSelected,
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.input,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  option: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one - 2,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { fontSize: 12 },
  optionLabelSelected: { fontWeight: '700' },
});
