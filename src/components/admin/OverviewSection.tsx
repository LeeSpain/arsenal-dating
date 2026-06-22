import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Stats = {
  pendingKitReviews: number;
  openReports: number;
  unreadFounderMessages: number;
  completedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  waitlistCount: number;
};

// Overview cards. Counts come from the admin-stats Edge Function (server-side
// is_admin enforced, returns numbers only). Waitlist count is read with the
// admin SELECT policy added in 20260527090000_admin_waitlist_select.sql.
// "New this week" is computed alongside the existing newUsersToday client-side
// from a single count query to avoid expanding the function for one number.
export function OverviewSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Parallel: edge function for the existing four counts + two direct
      // (admin-RLS) counts for waitlist and this-week signups.
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [statsRes, waitlistCount, weekCount] = await Promise.all([
        supabase.functions.invoke('admin-stats', { method: 'GET' }),
        supabase.from('waitlist').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('onboarding_step', 'completed')
          .gte('created_at', sevenDaysAgo),
      ]);
      if (cancelled) return;
      if (statsRes.error) {
        setError('Could not load stats.');
        setStats(null);
      } else {
        const s = statsRes.data as Omit<Stats, 'waitlistCount' | 'newUsersThisWeek'>;
        setStats({
          ...s,
          waitlistCount: waitlistCount.count ?? 0,
          newUsersThisWeek: weekCount.count ?? 0,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <ActivityIndicator color={Brand.red} />;
  if (error || !stats) {
    return (
      <ThemedText style={styles.error}>{error ?? 'Stats unavailable.'}</ThemedText>
    );
  }

  return (
    <View style={styles.grid}>
      <Card label="Members (completed)" value={stats.completedUsers} />
      <Card label="New today" value={stats.newUsersToday} />
      <Card label="New this week" value={stats.newUsersThisWeek} />
      <Card label="Waitlist" value={stats.waitlistCount} />
      <Card label="Pending kit reviews" value={stats.pendingKitReviews} attention />
      <Card label="Open reports" value={stats.openReports} attention />
      <Card label="Unread messages" value={stats.unreadFounderMessages} attention />
    </View>
  );
}

function Card({ label, value, attention }: { label: string; value: number; attention?: boolean }) {
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: {
    minWidth: 180,
    flexBasis: '23%',
    flexGrow: 1,
    padding: Spacing.two,
    borderRadius: Radius.card,
    gap: Spacing.half,
  },
  cardAttention: { borderWidth: 1, borderColor: Brand.red },
  value: { fontSize: 32, fontWeight: '800' },
  valueAttention: { color: Brand.red },
  error: { color: Functional.error },
});
