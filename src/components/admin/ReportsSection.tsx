import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
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

// Reports & moderation. Every action preserved (reviewing / dismiss / resolve /
// suspend / unsuspend / remove). report-review function enforces is_admin
// server-side. Surfaces themed per AdminTheme. Remove-user button keeps the
// destructive red regardless of theme — safety-critical action.
export function ReportsSection() {
  const { tokens } = useAdminTheme();
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
    load();
  }, [load]);

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

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={[styles.title, { color: tokens.text }]}>Reports & moderation</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          Review and act. Every state change is logged server-side.
        </ThemedText>
      </View>

      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>Nothing to review. 🎉</ThemedText>
      ) : null}

      {items.map((it) => {
        const busy = actingId === it.reportId;
        return (
          <View
            key={it.reportId}
            style={[
              styles.card,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.cardHead}>
              {it.reportedPhotoUrl ? (
                <Image source={{ uri: it.reportedPhotoUrl }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, { backgroundColor: tokens.surfaceRaised }]} />
              )}
              <View style={styles.headText}>
                <ThemedText style={[styles.name, { color: tokens.text }]}>
                  {it.reportedName ?? 'Unknown'}
                  {it.reportedSuspended ? '  ⏸ suspended' : ''}
                </ThemedText>
                <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                  Reported by {it.reporterName ?? 'someone'} · {it.reportsAgainstUser} report
                  {it.reportsAgainstUser === 1 ? '' : 's'} total
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={[styles.reason, { color: tokens.text }]}>
              {it.reason}
              {it.status !== 'open' ? `  ·  ${it.status}` : ''}
            </ThemedText>
            {it.details ? (
              <ThemedText type="small" style={{ color: tokens.text }}>
                {it.details}
              </ThemedText>
            ) : null}

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
          </View>
        );
      })}

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
  cardHead: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  photo: { width: 56, height: 56, borderRadius: 12 },
  headText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  reason: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.one },
  act: { flex: 1 },
  danger: { backgroundColor: Functional.error },
  error: { color: Functional.error },
});
