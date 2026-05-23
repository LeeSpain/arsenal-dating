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

type Item = {
  reportId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporterName: string | null;
  reportedId: string;
  reportedName: string | null;
  reportedSuspended: boolean;
  reportedPhotoUrl: string | null;
  reportsAgainstUser: number;
};

// Founder-only moderation queue. is_admin is enforced inside the report-review
// function; this gating is only for the UI.
export default function Reports() {
  const router = useRouter();
  const { profileStatus, loading } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [listing, setListing] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setListing(true);
    const { data, error } = await supabase.functions.invoke('report-review', { method: 'GET' });
    if (error) {
      setError('Could not load the reports queue.');
      setItems([]);
    } else {
      setItems((data?.items ?? []) as Item[]);
    }
    setListing(false);
  }, []);

  useEffect(() => {
    if (profileStatus?.isAdmin) load();
  }, [profileStatus?.isAdmin, load]);

  async function act(reportId: string, action: string) {
    setActingId(reportId);
    setError(null);
    const { error } = await supabase.functions.invoke('report-review', {
      method: 'POST',
      body: { reportId, action },
    });
    setActingId(null);
    if (error) {
      setError('That action failed. Please try again.');
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <ScreenShell title="Reports">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }
  if (!profileStatus?.isAdmin) {
    return (
      <ScreenShell title="Reports">
        <ThemedText themeColor="textSecondary">You don’t have access to this.</ThemedText>
        <PrimaryButton label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Reports"
      subtitle="Review and act. Admin-only, enforced server-side."
    >
      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nothing to review. 🎉</ThemedText>
      ) : null}

      {items.map((it) => {
        const busy = actingId === it.reportId;
        return (
          <ThemedView key={it.reportId} type="backgroundElement" style={styles.card}>
            <View style={styles.head}>
              {it.reportedPhotoUrl ? (
                <Image source={{ uri: it.reportedPhotoUrl }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.noPhoto]} />
              )}
              <View style={styles.headText}>
                <ThemedText style={styles.name}>
                  {it.reportedName ?? 'Unknown'}
                  {it.reportedSuspended ? '  ⏸ suspended' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Reported by {it.reporterName ?? 'someone'} · {it.reportsAgainstUser} report
                  {it.reportsAgainstUser === 1 ? '' : 's'} total
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.reason}>
              {it.reason}
              {it.status !== 'open' ? `  ·  ${it.status}` : ''}
            </ThemedText>
            {it.details ? <ThemedText type="small">{it.details}</ThemedText> : null}

            <View style={styles.actions}>
              <PrimaryButton label="Reviewing" variant="secondary" onPress={() => act(it.reportId, 'reviewing')} style={styles.act} />
              <PrimaryButton label="Dismiss" variant="secondary" onPress={() => act(it.reportId, 'dismiss')} style={styles.act} />
              <PrimaryButton label="Resolve" variant="secondary" onPress={() => act(it.reportId, 'resolve')} style={styles.act} />
            </View>
            <View style={styles.actions}>
              {it.reportedSuspended ? (
                <PrimaryButton label="Unsuspend" variant="secondary" loading={busy} onPress={() => act(it.reportId, 'unsuspend')} style={styles.act} />
              ) : (
                <PrimaryButton label="Suspend" loading={busy} onPress={() => act(it.reportId, 'suspend')} style={styles.act} />
              )}
              <PrimaryButton label="Remove user" loading={busy} onPress={() => act(it.reportId, 'remove')} style={[styles.act, styles.danger]} />
            </View>
          </ThemedView>
        );
      })}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.one },
  head: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  photo: { width: 56, height: 56, borderRadius: 12 },
  noPhoto: { backgroundColor: '#26282C' },
  headText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  reason: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.one },
  act: { flex: 1 },
  danger: { backgroundColor: Functional.error },
  error: { color: Functional.error },
});
