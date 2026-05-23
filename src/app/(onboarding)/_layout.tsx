import { Stack } from 'expo-router';

// Linear onboarding flow. Screens advance in order:
// age-gate -> kit-photo -> questionnaire -> profile -> preferences -> (tabs).
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
