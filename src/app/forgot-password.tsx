import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Functional, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Where the password-reset email link should land. Uses the current origin on
// web (works for both prod and any preview/dev origin that's in Supabase's
// allowlist), and falls back to the production PWA URL otherwise.
function resetRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/reset-password`;
  }
  return 'https://app.arsenaldating.com/reset-password';
}

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const value = email.trim();
    if (!value) {
      setError('Enter the email for your account.');
      return;
    }
    setLoading(true);
    // Send the reset email. We surface only generic feedback so this endpoint
    // doesn't disclose whether an email is registered.
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: resetRedirectUrl(),
    });
    setLoading(false);
    if (resetErr && /rate|too many/i.test(resetErr.message)) {
      setError('Too many attempts — please try again in a few minutes.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <ScreenShell
        title="Check your email"
        subtitle="If an account exists for that address, we’ve sent a link to set a new password. It may take a minute — check your spam too."
      >
        <PrimaryButton label="Back to sign in" onPress={() => router.replace('/sign-in')} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Forgot password?"
      subtitle="Enter your email and we’ll send you a link to set a new one."
    >
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
      />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Send reset link" loading={loading} onPress={onSubmit} />
      <Link href="/sign-in" style={styles.alt}>
        <ThemedText type="small" themeColor="accent">
          Back to sign in
        </ThemedText>
      </Link>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  error: { color: Functional.error },
  alt: { alignSelf: 'center', marginTop: Spacing.two },
});
