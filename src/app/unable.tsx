import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';

// Neutral terminal screen shown after a blocked sign-up (e.g. under-18). Says
// nothing about why — top-level route so no auth guard redirects away from it.
export default function Unable() {
  const router = useRouter();
  return (
    <ScreenShell title="We're unable to create an account">
      <ThemedText themeColor="textSecondary">
        We're unable to create an account at this time.
      </ThemedText>
      <PrimaryButton label="Back to start" onPress={() => router.replace('/welcome')} />
    </ScreenShell>
  );
}
