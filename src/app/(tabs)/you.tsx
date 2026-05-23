import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Functional, Spacing } from '@/constants/theme';
import { eraseAccount } from '@/lib/account';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Profile / settings hub. Profile editing + report/block are shells (step 3+).
// The auth actions here — sign out and GDPR account deletion — are live.
export default function You() {
  const router = useRouter();
  const { signOut } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  async function onDelete() {
    setError(null);
    setBusy(true);
    try {
      await eraseAccount(); // full erasure: storage + cascade DB + auth user
      router.replace('/welcome');
      supabase.auth.signOut();
    } catch {
      setBusy(false);
      setError('Could not delete your account. Please try again.');
    }
  }

  return (
    <ScreenShell
      title="You"
      subtitle="Your profile, settings, and safety tools."
      note="Profile editing and report/block are shells (step 3+). Sign out and account deletion below are live."
    >
      <PrimaryButton
        label="About this project"
        variant="secondary"
        onPress={() => router.push('/about')}
      />
      <PrimaryButton label="Sign out" variant="secondary" onPress={onSignOut} />

      {!confirming ? (
        <PrimaryButton
          label="Delete my account"
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      ) : (
        <View style={styles.confirm}>
          <ThemedText type="small" themeColor="textSecondary">
            This permanently deletes your account, photos, and all your data. This
            cannot be undone.
          </ThemedText>
          <PrimaryButton label="Delete forever" loading={busy} onPress={onDelete} />
          <PrimaryButton
            label="Cancel"
            variant="secondary"
            onPress={() => setConfirming(false)}
          />
        </View>
      )}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  confirm: { gap: Spacing.one, marginTop: Spacing.one },
  error: { color: Functional.error },
});
