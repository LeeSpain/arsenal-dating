import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/lib/session';

// Onboarding requires a signed-in user. Flow:
// age-gate -> kit-photo -> questionnaire -> profile -> preferences -> (tabs).
export default function OnboardingLayout() {
  const { session, loading } = useSession();

  if (loading) return null;
  if (!session) return <Redirect href="/welcome" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
