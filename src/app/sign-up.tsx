import { Redirect } from 'expo-router';

// Public sign-ups are OFF during Coming Soon. Anyone navigating directly to
// /sign-up is sent to the Coming Soon / waitlist screen — there is no public
// sign-up path while the app is admin-only. The previous sign-up form is
// preserved in git history; restore it when the app opens to the public.
export default function SignUp() {
  return <Redirect href="/welcome" />;
}
