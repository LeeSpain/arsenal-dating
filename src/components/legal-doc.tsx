import { StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { FontSize, Spacing } from '@/constants/theme';

export type LegalSection = { heading: string; paragraphs: string[] };

export function LegalDoc({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <ScreenShell title={title} note={`${updated} · Initial version — pending final legal review`}>
      <ThemedText themeColor="textSecondary" style={styles.intro}>
        {intro}
      </ThemedText>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <ThemedText style={styles.heading}>{s.heading}</ThemedText>
          {s.paragraphs.map((p, i) => (
            <ThemedText key={i} themeColor="textSecondary" style={styles.paragraph}>
              {p}
            </ThemedText>
          ))}
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  intro: { lineHeight: 22 },
  section: { marginTop: Spacing.two, gap: Spacing.half },
  heading: { fontSize: FontSize.section, fontWeight: '700' },
  paragraph: { lineHeight: 22 },
});
