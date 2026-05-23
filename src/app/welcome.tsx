import { Link, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Arsenal Dating"
      subtitle="Built by a Gooner, for Gooners."
    >
      <ThemedText style={styles.blurb}>
        Meet people who share the obsession. A passion project and a learning
        start-up — built by one Arsenal fan, for the fans.
      </ThemedText>

      <PrimaryButton label="Get started" onPress={() => router.push('/sign-in')} />
      <PrimaryButton
        label="I already have an account"
        variant="secondary"
        onPress={() => router.push('/sign-in')}
      />

      <Link href="/about" style={styles.aboutLink}>
        <ThemedText themeColor="accent" type="small">
          About this project
        </ThemedText>
      </Link>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  blurb: {
    marginBottom: Spacing.two,
  },
  aboutLink: {
    marginTop: Spacing.three,
    alignSelf: 'center',
  },
});
