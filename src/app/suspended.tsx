import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/lib/session';

// Calm "under review" screen for a suspended account. Login is also blocked at the
// auth layer (Supabase ban), so a suspended user can't get back in regardless.
export default function Suspended() {
  const router = useRouter();
  const { signOut } = useSession();
  return (
    <ScreenShell title="Your account is under review">
      <ThemedText themeColor="textSecondary">
        Access to Arsenal Dating is paused for your account while our team takes a look.
        If you think this is a mistake, hang tight — we’ll review it again.
      </ThemedText>
      <PrimaryButton
        label="Sign out"
        variant="secondary"
        onPress={async () => {
          await signOut();
          router.replace('/welcome');
        }}
      />
    </ScreenShell>
  );
}
