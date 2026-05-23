import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Functional, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    // Let the entry router send them to the right place (age gate / onboarding / deck).
    router.replace('/');
  }

  return (
    <ScreenShell title="Welcome back" subtitle="Sign in to your account.">
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
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        placeholder="Your password"
      />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Sign in" loading={loading} onPress={onSubmit} />
      <Link href="/sign-up" style={styles.alt}>
        <ThemedText type="small" themeColor="accent">
          Create an account
        </ThemedText>
      </Link>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: Functional.error,
  },
  alt: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
