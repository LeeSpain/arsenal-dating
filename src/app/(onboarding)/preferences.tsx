import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { OptionGroup } from '@/components/option-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const INTERESTED = [
  { label: 'Women', value: 'woman' },
  { label: 'Men', value: 'man' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Other', value: 'other' },
];
const DISTANCES = [
  { label: '25 km', value: '25' },
  { label: '50 km', value: '50' },
  { label: '100 km', value: '100' },
  { label: '250 km', value: '250' },
  { label: 'Anywhere', value: '20000' },
];

// Final onboarding step. On "Enter the app" we flip onboarding_completed -> the
// profile becomes visible in others' decks (public_profiles) and the deck unlocks.
export default function Preferences() {
  const router = useRouter();
  const { refreshProfileStatus } = useSession();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [interested, setInterested] = useState<string[]>([]);
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('99');
  const [distance, setDistance] = useState<string[]>(['100']);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from('profiles').select('id').maybeSingle();
      if (prof) {
        setProfileId(prof.id);
        const { data: p } = await supabase
          .from('preferences')
          .select('min_age, max_age, max_distance_km, interested_in_gender')
          .eq('profile_id', prof.id)
          .maybeSingle();
        if (p) {
          setMinAge(String(p.min_age));
          setMaxAge(String(p.max_age));
          setDistance([String(p.max_distance_km)]);
          setInterested(p.interested_in_gender ?? []);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function onFinish() {
    if (!profileId) return;
    setError(null);
    const min = parseInt(minAge, 10);
    const max = parseInt(maxAge, 10);
    if (!Number.isInteger(min) || min < 18) return setError('Minimum age must be 18 or over.');
    if (!Number.isInteger(max) || max < min) return setError('Maximum age must be at least the minimum.');

    setBusy(true);
    const { error: prefErr } = await supabase.from('preferences').upsert({
      profile_id: profileId,
      min_age: min,
      max_age: max,
      max_distance_km: parseInt(distance[0] ?? '100', 10),
      interested_in_gender: interested, // empty = everyone (deck applies this in step 5)
    });
    if (prefErr) {
      setBusy(false);
      return setError('Could not save. Please try again.');
    }
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true, onboarding_step: 'completed' })
      .eq('id', profileId);
    setBusy(false);
    if (profErr) return setError('Could not finish. Please try again.');

    await refreshProfileStatus();
    router.replace('/deck');
  }

  if (loading) {
    return (
      <ScreenShell title="Who would you like to meet?">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Who would you like to meet?" subtitle="Set your basics — you can change these later.">
      <ThemedText type="small" style={styles.label}>
        Show me
      </ThemedText>
      <OptionGroup options={INTERESTED} selected={interested} onChange={setInterested} multiple />
      <ThemedText type="small" themeColor="textSecondary">
        Leave empty to see everyone.
      </ThemedText>

      <View style={styles.ages}>
        <View style={styles.ageCell}>
          <TextField label="Min age" value={minAge} onChangeText={setMinAge} keyboardType="number-pad" maxLength={2} />
        </View>
        <View style={styles.ageCell}>
          <TextField label="Max age" value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" maxLength={2} />
        </View>
      </View>

      <ThemedText type="small" style={styles.label}>
        Maximum distance
      </ThemedText>
      <OptionGroup options={DISTANCES} selected={distance} onChange={setDistance} />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Enter the app" loading={busy} onPress={onFinish} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { marginLeft: Spacing.half, marginTop: Spacing.one },
  ages: { flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.one },
  ageCell: { flex: 1 },
  error: { color: Functional.error },
});
