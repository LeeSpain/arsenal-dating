import { Redirect } from 'expo-router';

// Entry point. Scaffold: always send to the welcome screen.
// TODO (auth step): check supabase.auth session here — if signed in and
// onboarding complete -> redirect to /(tabs)/deck; if signed in but incomplete
// -> /(onboarding)/age-gate; else -> /welcome.
export default function Index() {
  return <Redirect href="/welcome" />;
}
