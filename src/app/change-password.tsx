import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/**
 * Logged-in password change. We require the current password (defence in
 * depth: a hijacked session can't silently rotate the password) and let
 * Supabase enforce its strength/leaked-password rules on the new one.
 */
export default function ChangePassword() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.red} />
      </View>
    );
  }
  if (!session) return <Redirect href="/welcome" />;

  async function onSubmit() {
    setError(null);
    if (!session?.user.email) {
      setError('We can’t verify your current password without an email on file.');
      return;
    }
    if (!current) {
      setError('Enter your current password.');
      return;
    }
    if (next.length < 8) {
      setError('Use at least 8 characters for the new password.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords don’t match.');
      return;
    }
    if (next === current) {
      setError('Your new password can’t be the same as the current one.');
      return;
    }

    setBusy(true);
    // 1. Verify the current password — re-sign-in with it. This refreshes the
    //    session as a side effect (same user), which is fine.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: current,
    });
    if (reauthErr) {
      setBusy(false);
      setError(
        /rate|too many/i.test(reauthErr.message)
          ? 'Too many attempts — please try again in a few minutes.'
          : 'Current password is incorrect.',
      );
      return;
    }

    // 2. Update to the new password. Supabase enforces strength/leaked rules
    //    here; we just surface what it says.
    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <ScreenShell title="Password updated" subtitle="Use your new password the next time you sign in.">
        <PrimaryButton label="Done" onPress={() => router.back()} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Change password" subtitle="Enter your current password, then set a new one.">
      <TextField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        textContentType="password"
        placeholder="Your current password"
      />
      <TextField
        label="New password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        textContentType="newPassword"
        placeholder="At least 8 characters"
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        textContentType="newPassword"
        placeholder="Type it again"
      />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Update password" loading={busy} onPress={onSubmit} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: Functional.error },
});
