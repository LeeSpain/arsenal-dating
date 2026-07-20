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

      <SignupsSparkline />
    </View>
  );
}

const SPARK_DAYS = 14;
const SPARK_HEIGHT = 64;

// Local-date key (year-month-day) so buckets follow the admin's calendar day,
// not UTC. Two timestamps land in the same bucket iff they're the same local
// date.
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "Signups — last 14 days" bar chart. Reads waitlist.created_at directly with
// the admin SELECT RLS policy (20260527090000_admin_waitlist_select.sql),
// buckets client-side by local day, and draws plain <View> bars — no chart lib.
function SignupsSparkline() {
  const { tokens } = useAdminTheme();
  const [bars, setBars] = useState<{ key: string; label: string; value: number }[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // Build the 14 day buckets (oldest → today) from local midnight today.
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const days: { key: string; label: string }[] = [];
      for (let i = SPARK_DAYS - 1; i >= 0; i--) {
        const d = new Date(startOfToday);
        d.setDate(startOfToday.getDate() - i);
        days.push({
          key: localDayKey(d),
          label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        });
      }
      // gte bound = local midnight of the oldest bucket.
      const windowStart = new Date(startOfToday);
      windowStart.setDate(startOfToday.getDate() - (SPARK_DAYS - 1));

      const { data, error: qErr } = await supabase
        .from('waitlist')
        .select('created_at')
        .gte('created_at', windowStart.toISOString());

      if (cancelled) return;

      if (qErr) {
        setError('Could not load signups.');
        setBars(null);
        setLoading(false);
        return;
      }

      const counts = new Map<string, number>(days.map((d) => [d.key, 0]));
      for (const row of (data ?? []) as { created_at: string }[]) {
        const key = localDayKey(new Date(row.created_at));
        if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const built = days.map((d) => ({ ...d, value: counts.get(d.key) ?? 0 }));
      setBars(built);
      setTotal(built.reduce((sum, b) => sum + b.value, 0));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const max = bars ? Math.max(1, ...bars.map((b) => b.value)) : 1;

  return (
    <View style={[styles.sparkCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={styles.sparkHeader}>
        <ThemedText type="small" style={{ color: tokens.text }}>
          Signups — last 14 days
        </ThemedText>
        {bars ? (
          <ThemedText type="small" style={{ color: tokens.textSecondary }}>
            {total} total
          </ThemedText>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={Brand.red} />
      ) : error || !bars ? (
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          {error ?? 'Signups unavailable.'}
        </ThemedText>
      ) : (
        <>
          <View style={styles.sparkBars}>
            {bars.map((b) => {
              const h = b.value > 0 ? Math.max(3, Math.round((b.value / max) * SPARK_HEIGHT)) : 0;
              return (
                <View key={b.key} style={[styles.sparkCol, { borderBottomColor: tokens.border }]}>
                  <View
                    style={{
                      height: h,
                      width: '100%',
                      backgroundColor: tokens.accent,
                      borderTopLeftRadius: 2,
                      borderTopRightRadius: 2,
                    }}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.sparkAxis}>
            <ThemedText type="small" style={{ color: tokens.textSecondary }}>
              {bars[0].label}
            </ThemedText>
            <ThemedText type="small" style={{ color: tokens.textSecondary }}>
              {bars[bars.length - 1].label}
            </ThemedText>
          </View>
        </>
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
  sparkCard: {
    padding: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sparkBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: SPARK_HEIGHT,
    gap: Spacing.half,
  },
  sparkCol: {
    flex: 1,
    height: SPARK_HEIGHT,
    justifyContent: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sparkAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
