import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Functional, Spacing } from '@/constants/theme';

// "Coming Soon" stand-in for the app's public sign-up flow while we finish
// building. Public sign-ups are intentionally OFF, and there is NO visible
// entry point here — the public only ever sees Coming Soon + waitlist capture.
// The founder/admin reaches sign-in via the landing site's footer Admin link.
// The waitlist submission goes to the landing site's existing /api/waitlist
// endpoint, which stores it AND emails the founder via the notifier wired in
// earlier.
const WAITLIST_URL = 'https://www.arsenaldating.com/api/waitlist';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function Welcome() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit() {
    const value = email.trim().toLowerCase();
    if (!value || value.length > 200 || !EMAIL_RE.test(value)) {
      setStatus('error');
      setError('That email doesn’t look right.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(WAITLIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'app' }),
      });
      if (res.ok) {
        setStatus('done');
        return;
      }
      setStatus('error');
      if (res.status === 400) setError('That email doesn’t look right.');
      else if (res.status === 503) setError('The waitlist isn’t quite ready — please try again soon.');
      else setError('Something went wrong — please try again.');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again.');
    }
  }

  return (
    <ScreenShell title="Coming Soon" subtitle="Built by a Gooner, for Gooners.">
      <ThemedText style={styles.blurb}>
        We’re putting the finishing touches on Arsenal Dating. Leave your email and you’ll be
        first through the door when we launch — no spam, just one message when we’re live.
      </ThemedText>

      {status === 'done' ? (
        <View style={styles.success}>
          <ThemedText style={styles.successLine}>
            You’re on the list ✦ — we’ll be in touch. COYG.
          </ThemedText>
        </View>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            editable={status !== 'loading'}
          />
          {status === 'error' ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <PrimaryButton
            label="Keep me posted"
            loading={status === 'loading'}
            onPress={onSubmit}
          />
        </>
      )}

      <Link href="/about" style={styles.aboutLink}>
        <ThemedText themeColor="accent" type="small">
          About this project
        </ThemedText>
      </Link>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  blurb: { marginBottom: Spacing.two },
  success: {
    paddingVertical: Spacing.two,
  },
  successLine: { fontWeight: '600' },
  error: { color: Functional.error },
  aboutLink: { marginTop: Spacing.three, alignSelf: 'center' },
});
