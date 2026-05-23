import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

// Questionnaire feeds matching as a BOOST, never a filter (BUILD_SPEC §6). A new
// fan who answers little still gets a full deck. Real version is multi-step:
// favourite player(s), era, manager, supporting-since.
export default function Questionnaire() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Your Arsenal story"
      subtitle="Favourite players, era, manager, and when you started."
      note="Shell only. Multi-step form next. These answers boost match ordering — they never filter anyone into an empty deck."
    >
      <PrimaryButton
        label="Continue"
        onPress={() => router.push('/profile')}
      />
      <PrimaryButton
        label="Skip for now"
        variant="secondary"
        onPress={() => router.push('/profile')}
      />
    </ScreenShell>
  );
}
