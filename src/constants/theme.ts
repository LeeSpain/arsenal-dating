/**
 * Theme tokens for Arsenal Dating — the source of truth is DESIGN.md.
 * Base mode is DARK (DESIGN.md §"Base mode"). Light tokens are defined so the
 * flip is a one-liner later (see use-theme.ts).
 *
 * Fonts (DESIGN.md §Typography): Archivo for display/headlines, Inter for
 * UI/body, loaded via expo-google-fonts in app/_layout.tsx. Each weight is its
 * own family name (e.g. 'Inter_600SemiBold'), so set fontFamily explicitly via
 * the FontFamily tokens below rather than relying on fontWeight.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Raw brand palette (DESIGN.md §Colour palette). Red is an ACCENT, never a
 *  large background fill. */
export const Brand = {
  red: '#EF0107', // primary action / like
  redPressed: '#DB0007', // pressed state of red elements
  gold: '#9C824A', // earned/premium accent — use sparingly
  navy: '#063672', // secondary depth
  white: '#FFFFFF',
} as const;

/** Functional colours, deliberately separate from brand red (DESIGN.md). */
export const Functional = {
  success: '#1F9E5A',
  error: '#E5484D', // NOT Arsenal red, so errors never look like brand
  warning: '#E8A317',
  info: '#3B82F6',
} as const;

export const Colors = {
  // Dark is the default base.
  dark: {
    text: '#FFFFFF',
    textSecondary: '#A8ADB5',
    background: '#0E0F12',
    backgroundElement: '#1A1C20', // surface / cards
    backgroundSelected: '#24272C', // surface raised
    border: '#2E3238',
    accent: Brand.red,
    accentText: '#FFFFFF',
    gold: Brand.gold,
  },
  // Future light mode (DESIGN.md notes the flip).
  light: {
    text: '#16181C',
    textSecondary: '#5A6068',
    background: '#FFFFFF',
    backgroundElement: '#F5F6F8',
    backgroundSelected: '#ECEEF1',
    border: '#E1E4E8',
    accent: Brand.red,
    accentText: '#FFFFFF',
    gold: Brand.gold,
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark & keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Type scale (DESIGN.md §Typography). Minimum body never below 13. */
export const FontSize = {
  hero: 34,
  title: 24,
  section: 18,
  body: 16,
  caption: 13,
} as const;

/**
 * Font families (DESIGN.md §Typography), loaded in app/_layout.tsx.
 * Archivo = display/headlines (strong, sporty); Inter = UI/body (legible).
 * With expo-google-fonts every weight is a distinct family, so reach for these
 * tokens (not fontWeight) to pick a weight reliably on web + native.
 */
export const FontFamily = {
  // Inter — UI & body
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  // Archivo — display & headlines
  display: 'Archivo_700Bold',
  displaySemibold: 'Archivo_600SemiBold',
  displayHeavy: 'Archivo_800ExtraBold',
} as const;

/** 8pt spacing system (DESIGN.md §Layout); 4 allowed for tight spacing. */
export const Spacing = {
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 48,
} as const;

/** Corner radius (DESIGN.md §Layout): buttons/cards 16, inputs 12, round avatars. */
export const Radius = {
  input: 12,
  button: 16,
  card: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * Max width of the readable content column. The app is mobile-first; on wide
 * web/desktop viewports content is capped to this and centered so it never
 * floats unanchored. Full-bleed elements opt out deliberately.
 */
export const MaxContentWidth = 560;
