import { type ReactNode } from 'react';
import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontFamily, Spacing } from '@/constants/theme';

// Below this width we keep the existing mobile-native layout (full-screen).
// At/above it the app renders inside a centered phone-shaped frame and the
// remaining viewport becomes a quiet brand surround.
const WIDE_BREAKPOINT = 900;

const FRAME_WIDTH = 420;
const FRAME_MIN_HEIGHT = 640;
const FRAME_MAX_HEIGHT = 920;
const BEZEL = 8;
const OUTER_RADIUS = 44;
const INNER_RADIUS = OUTER_RADIUS - BEZEL;

/**
 * Wraps the app on wide web viewports in a centered phone-shaped frame so
 * desktop visitors see the actual mobile UI inside a designed surround, rather
 * than a narrow column floating on black. On real mobile devices (Platform.OS
 * native, or narrow web) this component renders {children} unchanged.
 *
 * DESIGN.md compliant: dark base (#0E0F12), red as accent only (no big red
 * surfaces here — atmosphere is a subtle navy + gold glow), Archivo wordmark,
 * generous whitespace.
 */
export function DesktopShell({ children }: { children: ReactNode }) {
  const { width: viewW, height: viewH } = useWindowDimensions();

  if (Platform.OS !== 'web' || viewW < WIDE_BREAKPOINT) {
    return <>{children}</>;
  }

  // The frame keeps a phone-like aspect but stays within the viewport. Min/max
  // bounds avoid a postage-stamp tall frame on short windows and an absurdly
  // tall one on big monitors.
  const frameHeight = Math.max(
    FRAME_MIN_HEIGHT,
    Math.min(FRAME_MAX_HEIGHT, viewH - 96),
  );

  return (
    <View style={styles.surround}>
      {/* Subtle matchday atmosphere — navy depth + a touch of gold. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.glowNavy} />
        <View style={styles.glowGold} />
      </View>

      {/* Brand mark + wordmark in the top-left, like a designed product page. */}
      <View style={styles.brand} pointerEvents="none">
        <Image source={{ uri: '/icons/icon-192.png' }} style={styles.brandMark} />
        <ThemedText style={styles.brandWord}>Arsenal Dating</ThemedText>
      </View>

      {/* The phone frame — bezel-as-background with a slightly smaller, fully
          rounded screen inside that clips the live app. */}
      <View
        style={[
          styles.bezel,
          { width: FRAME_WIDTH, height: frameHeight },
        ]}
      >
        <View style={styles.screen}>{children}</View>
      </View>

      {/* Honest tagline below the frame — grassroots tone, no hype. */}
      <ThemedText themeColor="textSecondary" style={styles.tagline}>
        Built by a Gooner, for Gooners. Best on your phone — add to your home screen for the
        full app.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  surround: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
    overflow: 'hidden',
  },
  glowNavy: {
    position: 'absolute',
    top: -240,
    left: '50%',
    width: 880,
    height: 880,
    marginLeft: -440,
    borderRadius: 500,
    backgroundColor: '#063672',
    opacity: 0.22,
    ...Platform.select({ web: { filter: 'blur(160px)' } }),
  },
  glowGold: {
    position: 'absolute',
    bottom: -160,
    right: '14%',
    width: 380,
    height: 380,
    borderRadius: 200,
    backgroundColor: '#9C824A',
    opacity: 0.10,
    ...Platform.select({ web: { filter: 'blur(130px)' } }),
  },
  brand: {
    position: 'absolute',
    top: Spacing.four,
    left: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brandWord: {
    fontFamily: FontFamily.displayHeavy,
    fontSize: 18,
    color: Colors.dark.text,
  },
  bezel: {
    borderRadius: OUTER_RADIUS,
    backgroundColor: Colors.dark.backgroundElement, // surface — the visible bezel ring
    padding: BEZEL,
    ...Platform.select({
      web: {
        boxShadow:
          '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
      },
    }),
  },
  screen: {
    flex: 1,
    borderRadius: INNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: Colors.dark.background,
  },
  tagline: {
    position: 'absolute',
    bottom: Spacing.four,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 520,
    paddingHorizontal: Spacing.three,
  },
});
