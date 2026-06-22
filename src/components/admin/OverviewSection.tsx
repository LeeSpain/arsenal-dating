import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { ThemedText } from '@/components/themed-text';
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
  const { tokens } = useAdminTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
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

  return (
    <View style={styles.root}>
      <WelcomeLine />

      {loading ? (
        <ActivityIndicator color={Brand.red} />
      ) : error || !stats ? (
        <ThemedText style={styles.error}>{error ?? 'Stats unavailable.'}</ThemedText>
      ) : (
        <View style={styles.grid}>
          <Card label="Members (completed)" value={stats.completedUsers} />
          <Card label="New today" value={stats.newUsersToday} />
          <Card label="New this week" value={stats.newUsersThisWeek} />
          <Card label="Waitlist" value={stats.waitlistCount} />
          <Card label="Pending kit reviews" value={stats.pendingKitReviews} attention />
          <Card label="Open reports" value={stats.openReports} attention />
          <Card label="Unread messages" value={stats.unreadFounderMessages} attention />
        </View>
      )}
    </View>
  );
}

// Personalised welcome — time-aware salutation, hard-coded "Lee" (per spec —
// deliberately NOT pulling the profile display name), live date + time that
// ticks every 30s. The 30s cadence is enough to never lag the minute boundary
// by more than 30s and keeps re-renders cheap.
function WelcomeLine() {
  const { tokens } = useAdminTheme();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const salutation =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.welcome}>
      <ThemedText style={[styles.greeting, { color: tokens.text }]}>
        {salutation}, Lee
      </ThemedText>
      <ThemedText style={[styles.datetime, { color: tokens.textSecondary }]}>
        {date}, {time}
      </ThemedText>
    </View>
  );
}

function Card({ label, value, attention }: { label: string; value: number; attention?: boolean }) {
  const { tokens } = useAdminTheme();
  const highlight = !!attention && value > 0;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: highlight ? tokens.attention : tokens.border,
          borderWidth: highlight ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <ThemedText
        style={[styles.value, { color: highlight ? tokens.attention : tokens.text }]}
      >
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color: tokens.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  welcome: { gap: Spacing.half / 2 },
  greeting: { fontSize: 24, fontWeight: '700' },
  datetime: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: {
    minWidth: 180,
    flexBasis: '23%',
    flexGrow: 1,
    padding: Spacing.two,
    borderRadius: Radius.card,
    gap: Spacing.half,
  },
  value: { fontSize: 32, fontWeight: '800' },
  error: { color: Functional.error },
});
