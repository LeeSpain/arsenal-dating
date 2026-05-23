import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Item = { profileId: string; displayName: string | null; kitPhotoUrl: string | null };

// Founder-only kit-review queue. The is_admin check here is only for UX (show/hide);
// the actual authorization is enforced inside the kit-review Edge Function.
export default function KitReview() {
  const router = useRouter();
  const { profileStatus, loading } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [listing, setListing] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setListing(true);
    const { data, error } = await supabase.functions.invoke('kit-review', { method: 'GET' });
    if (error) {
      setError('Could not load the review queue.');
      setItems([]);
    } else {
      setItems((data?.items ?? []) as Item[]);
    }
    setListing(false);
  }, []);

  useEffect(() => {
    if (profileStatus?.isAdmin) load();
  }, [profileStatus?.isAdmin, load]);

  async function decide(profileId: string, decision: 'approved' | 'rejected') {
    setActingId(profileId);
    setError(null);
    const { error } = await supabase.functions.invoke('kit-review', {
      method: 'POST',
      body: { profileId, decision },
    });
    setActingId(null);
    if (error) {
      setError('That action failed. Please try again.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.profileId !== profileId));
  }

  if (loading) {
    return (
      <ScreenShell title="Kit review">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }
  if (!profileStatus?.isAdmin) {
    return (
      <ScreenShell title="Kit review">
        <ThemedText themeColor="textSecondary">You don’t have access to this.</ThemedText>
        <PrimaryButton label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Kit review"
      subtitle="Pass = clearly wearing a recognisable Arsenal shirt."
      note="Approving adds the verified badge. This queue and the photos are admin-only, enforced server-side."
    >
      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nothing pending right now. 🎉</ThemedText>
      ) : null}

      {items.map((it) => (
        <ThemedView key={it.profileId} type="backgroundElement" style={styles.card}>
          {it.kitPhotoUrl ? (
            <Image source={{ uri: it.kitPhotoUrl }} style={styles.photo} contentFit="cover" />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              (no photo)
            </ThemedText>
          )}
          <ThemedText style={styles.name}>{it.displayName ?? 'Unnamed'}</ThemedText>
          <View style={styles.actions}>
            <PrimaryButton
              label="Approve"
              loading={actingId === it.profileId}
              onPress={() => decide(it.profileId, 'approved')}
              style={styles.actionBtn}
            />
            <PrimaryButton
              label="Reject"
              variant="secondary"
              onPress={() => decide(it.profileId, 'rejected')}
              style={styles.actionBtn}
            />
          </View>
        </ThemedView>
      ))}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.one },
  photo: { width: '100%', height: 280, borderRadius: Radius.card },
  name: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.one },
  actionBtn: { flex: 1 },
  error: { color: Functional.error },
});
