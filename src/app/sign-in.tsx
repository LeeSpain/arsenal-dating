import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

export default function SignIn() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Sign in or sign up"
      subtitle="Email or phone, via Supabase Auth."
      note="Shell only. Next build step wires Supabase Auth (email/phone), then sends new users into the 18+ age gate."
    >
      <PrimaryButton
        label="Continue"
        onPress={() => router.push('/age-gate')}
      />
    </ScreenShell>
  );
}
