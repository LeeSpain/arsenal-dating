import { StyleSheet } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function About() {
  return (
    <ScreenShell
      title="About"
      subtitle="Built by a Gooner, for Gooners."
    >
      <ThemedText style={styles.para}>
        Arsenal Dating is a passion project and a learning start-up, built by a
        single Arsenal fan. The goal is simple: help passionate Gooners meet
        people who share that obsession, and keep everyone safe while they do.
      </ThemedText>
      <ThemedText style={styles.para}>
        It is grassroots and honest, not corporate. Things will be rough around
        the edges as it grows — that is part of the deal. Thanks for being here
        early.
      </ThemedText>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  para: {
    marginBottom: Spacing.two,
  },
});
