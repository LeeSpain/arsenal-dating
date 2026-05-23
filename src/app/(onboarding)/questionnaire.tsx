import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Chips } from '@/components/chips';
import { OptionGroup } from '@/components/option-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const ERAS = [
  { label: 'The Invincibles (03–04)', value: 'invincibles' },
  { label: 'Highbury years', value: 'highbury' },
  { label: 'Late Wenger', value: 'late_wenger' },
  { label: 'Arteta era', value: 'arteta' },
  { label: 'Other', value: 'other' },
];
const MANAGERS = [
  { label: 'Arsène Wenger', value: 'wenger' },
  { label: 'Mikel Arteta', value: 'arteta' },
  { label: 'George Graham', value: 'graham' },
  { label: 'Herbert Chapman', value: 'chapman' },
  { label: 'Other', value: 'other' },
];
const PLAYER_SUGGESTIONS = ['Henry', 'Bergkamp', 'Vieira', 'Saka', 'Ødegaard', 'Wright', 'Adams', 'Pirès'];

// Every question is OPTIONAL. Sparse answers are fine — they only reduce the
// matching BOOST later (step 5), never filter anyone out of the deck.
export default function Questionnaire() {
  const router = useRouter();
  const { session } = useSession();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [era, setEra] = useState<string[]>([]);
  const [manager, setManager] = useState<string[]>([]);
  const [since, setSince] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from('profiles').select('id').maybeSingle();
      if (prof) {
        setProfileId(prof.id);
        const { data: q } = await supabase
          .from('questionnaire')
          .select('favourite_players, favourite_era, favourite_manager, supporting_since')
          .eq('profile_id', prof.id)
          .maybeSingle();
        if (q) {
          setPlayers(q.favourite_players ?? []);
          setEra(q.favourite_era ? [q.favourite_era] : []);
          setManager(q.favourite_manager ? [q.favourite_manager] : []);
          setSince(q.supporting_since ? String(q.supporting_since) : '');
        }
      }
      setLoading(false);
    })();
  }, []);

  async function next(save: boolean) {
    if (!profileId) return;
    setBusy(true);
    if (save) {
      const yearNum = parseInt(since, 10);
      const supporting_since =
        Number.isInteger(yearNum) && yearNum >= 1886 && yearNum <= new Date().getFullYear()
          ? yearNum
          : null;
      await supabase.from('questionnaire').upsert({
        profile_id: profileId,
        favourite_players: players,
        favourite_era: era[0] ?? null,
        favourite_manager: manager[0] ?? null,
        supporting_since,
      });
    }
    await supabase.from('profiles').update({ onboarding_step: 'preferences' }).eq('id', profileId);
    setBusy(false);
    router.replace('/preferences');
  }

  if (loading) {
    return (
      <ScreenShell title="Your Arsenal story">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Your Arsenal story"
      subtitle="All optional — answer what you like."
      note="These help us put fellow Gooners who share your favourites higher up your deck. Skipping never shrinks your deck — you'll still see everyone."
    >
      <ThemedText type="small" style={styles.label}>
        Favourite player(s)
      </ThemedText>
      <Chips
        values={players}
        onChange={setPlayers}
        placeholder="Add a player"
        suggestions={PLAYER_SUGGESTIONS}
      />

      <ThemedText type="small" style={styles.label}>
        Favourite era
      </ThemedText>
      <OptionGroup options={ERAS} selected={era} onChange={setEra} />

      <ThemedText type="small" style={styles.label}>
        Favourite manager
      </ThemedText>
      <OptionGroup options={MANAGERS} selected={manager} onChange={setManager} />

      <TextField
        label="Supporting since (year)"
        value={since}
        onChangeText={setSince}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="e.g. 2004"
      />

      <PrimaryButton label="Continue" loading={busy} onPress={() => next(true)} />
      <PrimaryButton label="Skip for now" variant="secondary" onPress={() => next(false)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { marginLeft: Spacing.half, marginTop: Spacing.one },
});
