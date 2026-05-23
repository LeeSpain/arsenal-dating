import { StyleSheet } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// DRAFT placeholder. NOT legal advice and NOT the final terms.
export default function Terms() {
  return (
    <ScreenShell
      title="Terms of Use"
      note="DRAFT placeholder — not legal advice. Final terms will be written and reviewed before launch."
    >
      <ThemedText style={styles.para}>
        The full Terms of Use will cover the basics of using Arsenal Dating:
      </ThemedText>
      <ThemedText style={styles.para}>
        • you must be 18 or over to use the app{'\n'}
        • be respectful; harassment, abuse, and impersonation are not allowed{'\n'}
        • report and block tools exist for your safety{'\n'}
        • we may remove accounts that break these rules{'\n'}
        • the app is provided as-is during early development
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.para}>
        Until the reviewed version is published, treat this screen as a
        placeholder.
      </ThemedText>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  para: { marginBottom: Spacing.two },
});
