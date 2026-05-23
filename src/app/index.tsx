import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { useSession } from '@/lib/session';

// Entry router: send the user to the right place based on session + onboarding.
export default function Index() {
  const { session, profileStatus, loading } = useSession();

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={Brand.red} />
      </ThemedView>
    );
  }
  if (!session) return <Redirect href="/welcome" />;
  if (!profileStatus?.exists) return <Redirect href="/age-gate" />;
  if (!profileStatus.onboardingCompleted) return <Redirect href="/kit-photo" />;
  return <Redirect href="/deck" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
