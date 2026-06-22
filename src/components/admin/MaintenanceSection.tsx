import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Functional, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Maintenance section. Only action in v1 is the existing purge-orphans
// function (clears storage objects whose owning DB rows are gone). Lifted
// unchanged from the You-tab admin block. Future maintenance actions slot
// in here as sibling cards.
export function MaintenanceSection() {
  const [purging, setPurging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPurge() {
    setPurging(true);
    setError(null);
    setNotice(null);
    const { data, error: purgeErr } = await supabase.functions.invoke('purge-orphans', {
      method: 'POST',
    });
    setPurging(false);
    if (purgeErr) {
      setError('Purge failed.');
      return;
    }
    setNotice(`Purged ${data?.purged ?? 0} orphaned image(s).`);
  }

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={styles.title}>Maintenance</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          One-off admin actions. All server-enforced.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={styles.cardTitle}>Purge orphaned images</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Removes storage objects whose owning rows are gone (cleans up after
          account deletions and rejected kit photos).
        </ThemedText>
        <PrimaryButton
          label="Purge orphaned images"
          variant="secondary"
          loading={purging}
          onPress={onPurge}
        />
        {notice ? (
          <ThemedText type="small" themeColor="textSecondary">
            {notice}
          </ThemedText>
        ) : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  head: { gap: Spacing.half, marginBottom: Spacing.one },
  title: { fontSize: 22, fontWeight: '800' },
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.one },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  error: { color: Functional.error },
});
