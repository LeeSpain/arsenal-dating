import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

export default function ProfileCreation() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Create your profile"
      subtitle="Photos, a short bio, and what you're looking for."
      note="Shell only. Real version: photo upload (ordered, one primary), bio, looking-for, and gender — gender is stored explicitly because matching and the women-message-first rule branch on it."
    >
      <PrimaryButton
        label="Continue"
        onPress={() => router.push('/preferences')}
      />
    </ScreenShell>
  );
}
