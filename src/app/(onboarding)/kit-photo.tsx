import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

// Kit photo is stored and flagged for MANUAL review (no auto image classification
// in MVP). Onboarding must NOT stall waiting on review — the badge is applied
// later. So both "upload" and "skip for now" move the user forward.
export default function KitPhoto() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Show us your Arsenal kit"
      subtitle="Upload a photo wearing an Arsenal top."
      note="Shell only. The photo is stored and queued for manual review — onboarding never waits on it. The verified badge gets applied later."
    >
      <PrimaryButton
        label="Upload kit photo"
        onPress={() => router.push('/questionnaire')}
      />
      <PrimaryButton
        label="Skip for now"
        variant="secondary"
        onPress={() => router.push('/questionnaire')}
      />
    </ScreenShell>
  );
}
