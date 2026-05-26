import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Landing page for the password-reset email link. SessionProvider is the
 * single source of truth for "is this a real recovery flow?" — it owns the
 * PASSWORD_RECOVERY auth event and exposes `isPasswordRecovery` here. Gating
 * on that flag (rather than "any session exists") is the security tightening:
 * a signed-in user manually navigating to /reset-password is treated as an
 * invalid link, not handed a no-current-password rotate.
 *
 * Strength / leaked-password rules are enforced server-side by Supabase on
 * updateUser and the error is surfaced verbatim.
 */
export default function ResetPassword() {
  const router = useRouter();
  const { isPasswordRecovery, clearPasswordRecovery } = useSession();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Recovery confirmed by SessionProvider — show the form.
    if (isPasswordRecovery) {
      setPhase((prev) => (prev === 'checking' ? 'ready' : prev));
      return;
    }
    // No recovery in progress: give Supabase a brief grace to emit the event
    // (in case it hasn't propagated yet), then mark the link invalid. Once
    // phase has left 'checking' we never roll it back, so a late event can't
    // surprise the user with the form after they've been shown "expired".
    const timer = setTimeout(() => {
      setPhase((prev) => (prev === 'checking' ? 'invalid' : prev));
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPasswordRecovery]);

  async function onSubmit() {
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    setBusy(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateErr) {
      // Supabase enforces leaked-password + strength rules; surface its message.
      setError(updateErr.message);
      return;
    }
    // Recovery's done — clear the flag so the entry router resumes normal
    // routing on the next navigation.
    clearPasswordRecovery();
    setPhase('done');
  }

  if (phase === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.red} />
      </View>
    );
  }

  if (phase === 'invalid') {
    return (
      <ScreenShell
        title="Link expired"
        subtitle="This password-reset link is invalid or has expired. Request a new one and try again."
      >
        <PrimaryButton label="Request a new link" onPress={() => router.replace('/forgot-password')} />
        <Link href="/sign-in" style={styles.alt}>
          <ThemedText type="small" themeColor="accent">
            Back to sign in
          </ThemedText>
        </Link>
      </ScreenShell>
    );
  }

  if (phase === 'done') {
    return (
      <ScreenShell title="Password updated" subtitle="You’re signed in with your new password.">
        <PrimaryButton label="Continue" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Set a new password" subtitle="Pick something strong you haven’t used elsewhere.">
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
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
  alt: { alignSelf: 'center', marginTop: Spacing.two },
});
