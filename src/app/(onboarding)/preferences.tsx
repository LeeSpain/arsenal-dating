import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

export default function Preferences() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Who would you like to meet?"
      subtitle="Age range, distance, and gender."
      note="Shell only. These set the basic deck filters (age, distance, gender). The questionnaire then re-orders within those results — it doesn't shrink them."
    >
      <PrimaryButton
        label="Enter the app"
        onPress={() => router.replace('/deck')}
      />
    </ScreenShell>
  );
}
