import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Checkbox } from '@/components/checkbox';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { POLICY_VERSION } from '@/constants/legal';
import { Functional, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (!agreed) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Consent record carried into the profile when the age gate creates it.
        data: {
          tos_accepted_at: new Date().toISOString(),
          policy_version: POLICY_VERSION,
        },
      },
    });
    setLoading(false);

    if (signErr) {
      setError(signErr.message);
      return;
    }
    if (data.session) {
      router.replace('/age-gate');
    } else {
      // Project has email confirmation on — finish after confirming + signing in.
      setInfo('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <ScreenShell title="Create your account" subtitle="Email and a password to get started.">
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
        textContentType="newPassword"
        placeholder="At least 8 characters"
      />

      <Checkbox checked={agreed} onChange={setAgreed}>
        <ThemedText type="small" themeColor="textSecondary">
          I agree to the Terms of Use and Privacy Policy.
        </ThemedText>
      </Checkbox>
      <View style={styles.legalLinks}>
        <Link href="/legal/terms">
          <ThemedText type="small" themeColor="accent">
            Terms
          </ThemedText>
        </Link>
        <ThemedText type="small" themeColor="textSecondary">
          {'   ·   '}
        </ThemedText>
        <Link href="/legal/privacy">
          <ThemedText type="small" themeColor="accent">
            Privacy Policy
          </ThemedText>
        </Link>
      </View>

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      {info ? (
        <ThemedText themeColor="textSecondary">{info}</ThemedText>
      ) : null}

      <PrimaryButton label="Create account" loading={loading} onPress={onSubmit} />

      <Link href="/sign-in" style={styles.alt}>
        <ThemedText type="small" themeColor="accent">
          I already have an account
        </ThemedText>
      </Link>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.three,
  },
  error: {
    color: Functional.error,
  },
  alt: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
