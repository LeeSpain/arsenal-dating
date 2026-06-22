import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Item = { profileId: string; displayName: string | null; kitPhotoUrl: string | null };

// Kit-review queue. Same Edge Function calls + UI shape as the original
// standalone route; surfaces themed per AdminTheme. The kit-review function
// enforces is_admin server-side; the cosmetic gate lives in admin/index.tsx.
export function KitReviewSection() {
  const { tokens } = useAdminTheme();
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
    load();
  }, [load]);

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

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={[styles.title, { color: tokens.text }]}>Kit review</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          Pass = clearly wearing a recognisable Arsenal shirt. Approving adds the verified badge.
        </ThemedText>
      </View>

      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>
          Nothing pending right now. 🎉
        </ThemedText>
      ) : null}

      {items.map((it) => (
        <View
          key={it.profileId}
          style={[
            styles.card,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {it.kitPhotoUrl ? (
            <Image source={{ uri: it.kitPhotoUrl }} style={styles.photo} contentFit="cover" />
          ) : (
            <ThemedText type="small" style={{ color: tokens.textSecondary }}>
              (no photo)
            </ThemedText>
          )}
          <ThemedText style={[styles.name, { color: tokens.text }]}>
            {it.displayName ?? 'Unnamed'}
          </ThemedText>
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
        </View>
      ))}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  head: { gap: Spacing.half, marginBottom: Spacing.one },
  title: { fontSize: 22, fontWeight: '800' },
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.one },
  photo: { width: '100%', height: 280, borderRadius: Radius.card },
  name: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.one },
  actionBtn: { flex: 1 },
  error: { color: Functional.error },
});
