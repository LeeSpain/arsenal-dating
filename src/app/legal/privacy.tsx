import { StyleSheet } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// DRAFT placeholder. NOT legal advice and NOT the final policy. Real GDPR-
// compliant text must be written/reviewed by a professional before launch.
export default function Privacy() {
  return (
    <ScreenShell
      title="Privacy Policy"
      note="DRAFT placeholder — not legal advice. This will be replaced with a reviewed, GDPR-compliant policy before launch."
    >
      <ThemedText style={styles.para}>
        Arsenal Dating is built by a single fan and is in early development. The
        final privacy policy will explain, in plain language:
      </ThemedText>
      <ThemedText style={styles.para}>
        • what data we collect (account details, profile info, photos, coarse
        location) and why{'\n'}
        • how long we keep it and how it is secured{'\n'}
        • your GDPR rights: access, correction, export, and erasure{'\n'}
        • how to delete your account and all associated data at any time{'\n'}
        • who to contact about your data
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.para}>
        Until that reviewed version is published, treat this screen as a
        placeholder.
      </ThemedText>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  para: { marginBottom: Spacing.two },
});
