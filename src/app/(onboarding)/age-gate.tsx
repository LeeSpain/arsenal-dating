import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';

// MVP decision: self-attested age (DOB + 18+ confirm). Hard gate — under-18s
// cannot proceed. The real gate (DOB picker + block-if-under-18 + storing dob)
// is built in the auth/age-gate step.
export default function AgeGate() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Are you 18 or over?"
      subtitle="Arsenal Dating is strictly 18+."
      note="Shell only. Real version: date-of-birth entry + explicit 18+ confirmation. Anyone under 18 is blocked here and cannot continue."
    >
      <PrimaryButton
        label="I'm 18 or over — continue"
        onPress={() => router.push('/kit-photo')}
      />
    </ScreenShell>
  );
}
