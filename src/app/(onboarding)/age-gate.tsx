import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Functional, Spacing } from '@/constants/theme';
import { eraseAccount } from '@/lib/account';
import { isAdult, parseDob, toIsoDate } from '@/lib/age';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// NON-COACHABLE age gate (founder requirement): we ask for date of birth plainly.
// No "18+" hint near the input, and on failure NO message that reveals what date
// would have worked — just a neutral outcome. Under-18 triggers the SAME full
// erasure path as GDPR deletion; nothing about a minor is stored.
export default function AgeGate() {
  const router = useRouter();
  const { refreshProfileStatus } = useSession();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    setError(null);
    const dob = parseDob(Number(year), Number(month), Number(day));
    if (!dob) {
      setError('Please enter a valid date.'); // format only — reveals no threshold
      return;
    }

    setBusy(true);

    if (!isAdult(dob)) {
      // Full erasure of the just-created account. Navigate to the neutral screen
      // BEFORE signing out so no route guard races us off it.
      try {
        await eraseAccount();
      } catch {
        // Reveal nothing on failure.
      }
      router.replace('/unable');
      supabase.auth.signOut();
      return;
    }

    // 18+: create the profile row with dob + the consent recorded at sign-up.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Something went wrong. Please try again.');
      return;
    }
    const meta = (user.user_metadata ?? {}) as {
      tos_accepted_at?: string;
      policy_version?: string;
    };
    const { error: insErr } = await supabase.from('profiles').insert({
      auth_id: user.id,
      dob: toIsoDate(dob),
      tos_accepted_at: meta.tos_accepted_at ?? new Date().toISOString(),
      policy_version: meta.policy_version ?? null,
    });
    if (insErr) {
      setBusy(false);
      setError('Something went wrong. Please try again.');
      return;
    }
    await refreshProfileStatus();
    setBusy(false);
    router.replace('/kit-photo');
  }

  return (
    <ScreenShell title="Your date of birth">
      <View style={styles.row}>
        <View style={styles.cell}>
          <TextField
            label="Day"
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="DD"
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Month"
            value={month}
            onChangeText={setMonth}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="MM"
          />
        </View>
        <View style={styles.cellWide}>
          <TextField
            label="Year"
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
          />
        </View>
      </View>
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Continue" loading={busy} onPress={onContinue} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  cell: { flex: 1 },
  cellWide: { flex: 1.4 },
  error: { color: Functional.error },
});
