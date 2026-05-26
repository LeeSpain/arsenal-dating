import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Landing page for the password-reset email link. Supabase parses the recovery
 * token from the URL hash (detectSessionInUrl) and fires a PASSWORD_RECOVERY
 * auth event; once we see either a session or that event, we let the user set
 * a new password. Strength/leaked-password rules are enforced server-side by
 * Supabase and surfaced here.
 */
export default function ResetPassword() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      readyRef.current = true;
      if (!cancelled) setPhase('ready');
    };

    // Case 1: Supabase parsed the recovery hash before we mounted — session
    // already present.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) markReady();
    });

    // Case 2: parse happens after mount — listen for the event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) markReady();
    });

    // Case 3: link is invalid/expired — no session, no event after a brief grace.
    const timer = setTimeout(() => {
      if (!cancelled && !readyRef.current) setPhase('invalid');
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

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
