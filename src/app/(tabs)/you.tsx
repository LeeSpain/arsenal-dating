import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

// Profile / settings hub. Also the entry point for safety actions (report/block
// reach an admin queue) and the About screen.
export default function You() {
  const router = useRouter();

  return (
    <ScreenShell
      title="You"
      subtitle="Your profile, settings, and safety tools."
      note="Shell only. Real version: edit profile/photos/preferences, sign out, and access report/block. Report and block are MVP safety features, not later."
    >
      <PrimaryButton
        label="About this project"
        variant="secondary"
        onPress={() => router.push('/about')}
      />
    </ScreenShell>
  );
}
