import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { useSession } from '@/lib/session';

// Entry router: send the user to the right place based on session + onboarding.
export default function Index() {
  const { session, profileStatus, loading, isPasswordRecovery } = useSession();

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={Brand.red} />
      </ThemedView>
    );
  }
  // Recovery wins over every other routing decision — even if the user has
  // a fully-onboarded session, mid-recovery means "go set a new password".
  if (isPasswordRecovery) return <Redirect href="/reset-password" />;
  if (!session) return <Redirect href="/welcome" />;
  // Admin-only lock during Coming Soon: a logged-in non-admin only ever sees the
  // Coming Soon / waitlist screen. Only admins continue into the app.
  if (!profileStatus?.isAdmin) return <Redirect href="/welcome" />;
  if (profileStatus.isSuspended) return <Redirect href="/suspended" />;
  if (!profileStatus?.exists) return <Redirect href="/age-gate" />;
  if (!profileStatus.onboardingCompleted) {
    // Resume at the step they left off on.
    switch (profileStatus.onboardingStep) {
      case 'kit_photo':
        return <Redirect href="/kit-photo" />;
      case 'questionnaire':
        return <Redirect href="/questionnaire" />;
      case 'preferences':
        return <Redirect href="/preferences" />;
      default:
        return <Redirect href="/profile" />;
    }
  }
  return <Redirect href="/deck" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
