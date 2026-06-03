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

type Stats = {
  pendingKitReviews: number;
  openReports: number;
  unreadFounderMessages: number;
  completedUsers: number;
  newUsersToday: number;
};

// Admin dashboard — count cards + entry points to the existing queues. Like the
// other admin screens, is_admin is enforced inside admin-stats; this UI gate is
// cosmetic.
export default function AdminDashboard() {
  const router = useRouter();
  const { profileStatus, loading } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [listing, setListing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setListing(true);
    const { data, error } = await supabase.functions.invoke('admin-stats', { method: 'GET' });
    if (error) {
      setError('Could not load admin stats.');
      setStats(null);
    } else {
      setStats(data as Stats);
    }
    setListing(false);
  }, []);

  useEffect(() => {
    if (profileStatus?.isAdmin) load();
  }, [profileStatus?.isAdmin, load]);

  async function onPurge() {
    setPurging(true);
    setError(null);
    const { data, error: purgeErr } = await supabase.functions.invoke('purge-orphans', {
      method: 'POST',
    });
    setPurging(false);
    if (purgeErr) {
      setError('Purge failed.');
      return;
    }
    setPurgeNotice(`Purged ${data?.purged ?? 0} orphaned image(s).`);
  }

  if (loading) {
    return (
      <ScreenShell title="Admin">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }
  if (!profileStatus?.isAdmin) {
    return (
      <ScreenShell title="Admin">
        <ThemedText themeColor="textSecondary">You don’t have access to this.</ThemedText>
        <PrimaryButton label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
  }

  const unread = stats?.unreadFounderMessages ?? 0;

  return (
    <ScreenShell
      title="Admin"
      subtitle="Queues and state. Everything here is admin-only, enforced server-side."
    >
      {listing && !stats ? <ActivityIndicator color={Brand.red} /> : null}

      {stats ? (
        <View style={styles.grid}>
          <StatCard label="Pending kit reviews" value={stats.pendingKitReviews} attention />
          <StatCard label="Open reports" value={stats.openReports} attention />
          <StatCard label="Unread messages" value={stats.unreadFounderMessages} attention />
          <StatCard label="Completed users" value={stats.completedUsers} />
          <StatCard label="New today" value={stats.newUsersToday} />
        </View>
      ) : null}

      <PrimaryButton label="Kit review queue" onPress={() => router.push('/admin/kit-review')} />
      <PrimaryButton label="Reports queue" onPress={() => router.push('/admin/reports')} />
      <PrimaryButton
        label={unread > 0 ? `Founder messages · ${unread} new` : 'Founder messages'}
        onPress={() => router.push('/admin/messages')}
      />
      <PrimaryButton
        label="Purge orphaned images"
        variant="secondary"
        loading={purging}
        onPress={onPurge}
      />
      {purgeNotice ? (
        <ThemedText type="small" themeColor="textSecondary">
          {purgeNotice}
        </ThemedText>
      ) : null}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </ScreenShell>
  );
}

// Compact stat tile. Attention cards turn red only when the count is > 0 —
// keeps the dark base premium and respects the "red is an accent" rule.
function StatCard({
  label,
  value,
  attention,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  const highlight = !!attention && value > 0;
  return (
    <ThemedView type="backgroundElement" style={[styles.card, highlight && styles.cardAttention]}>
      <ThemedText style={[styles.value, highlight && styles.valueAttention]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: Spacing.two,
    borderRadius: Radius.card,
    gap: Spacing.half,
  },
  cardAttention: { borderWidth: 1, borderColor: Brand.red },
  value: { fontSize: 28, fontWeight: '800' },
  valueAttention: { color: Brand.red },
  error: { color: Functional.error },
});
