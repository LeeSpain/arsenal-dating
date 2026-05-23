import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Short note on what this screen will do once built (scaffold placeholder). */
  note?: string;
  children?: ReactNode;
};

/**
 * Shared placeholder used by the MVP screen shells. Each screen states its name,
 * a one-line purpose, and renders its own single primary action in `children`.
 * Per DESIGN.md the cannon motif is intentionally NOT on every screen.
 */
export function ScreenShell({ title, subtitle, note, children }: Props) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
          {note ? (
            <ThemedView type="backgroundElement" style={styles.noteBox}>
              <ThemedText type="small" themeColor="textSecondary">
                {note}
              </ThemedText>
            </ThemedView>
          ) : null}
          <View style={styles.actions}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: FontSize.body,
    lineHeight: 24,
  },
  noteBox: {
    padding: Spacing.two,
    borderRadius: Radius.card,
  },
  actions: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
});
