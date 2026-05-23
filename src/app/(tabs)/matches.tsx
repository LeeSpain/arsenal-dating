import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

export default function Matches() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Matches"
      subtitle="Mutual likes land here."
      note="Shell only. Real version lists your matches; tapping one opens the chat. Women message first on mixed matches (BUILD_SPEC §7)."
    >
      <PrimaryButton
        label="Open a sample chat"
        variant="secondary"
        onPress={() => router.push('/chat/demo')}
      />
    </ScreenShell>
  );
}
