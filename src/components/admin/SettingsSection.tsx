import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemeSwitcher, useAdminTheme } from '@/components/admin/AdminThemeContext';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Settings hub for the founder/admin. Three cards: profile (read-only), the
// relocated theme switcher (used to live top-right of the dashboard), and a
// notification-preferences placeholder. No DB table yet — for v1 the
// notification card reads "always-on" alerts; per-alert toggles can land
// later behind a small admin_settings table.
export function SettingsSection() {
  const router = useRouter();
  const { session } = useSession();
  const { tokens } = useAdminTheme();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // One-time read of the admin's own profile row. RLS already restricts this
  // to the caller's own row, so no admin gate needed for the query itself.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .maybeSingle();
      if (cancelled) return;
      setDisplayName((data?.display_name as string | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const email = session?.user.email ?? '—';

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={[styles.title, { color: tokens.text }]}>Settings</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          Your profile, appearance, and notifications.
        </ThemedText>
      </View>

      {/* Profile ------------------------------------------------------------ */}
      <Card>
        <ThemedText style={[styles.cardTitle, { color: tokens.text }]}>Profile</ThemedText>
        {loading ? (
          <ActivityIndicator color={Brand.red} />
        ) : (
          <>
            <ThemedText style={[styles.profileName, { color: tokens.text }]}>
              {displayName ?? 'Unnamed'}
            </ThemedText>
            <ThemedText type="small" style={{ color: tokens.textSecondary }}>
              {email}
            </ThemedText>
          </>
        )}
        <PrimaryButton
          label="Change password"
          variant="secondary"
          onPress={() => router.push('/change-password')}
          style={styles.action}
        />
      </Card>

      {/* Appearance --------------------------------------------------------- */}
      <Card>
        <ThemedText style={[styles.cardTitle, { color: tokens.text }]}>Appearance</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          Pick the look of the Control Centre. Your choice persists on this browser.
        </ThemedText>
        <View style={styles.themeRow}>
          <ThemedText type="small" style={[styles.themeLabel, { color: tokens.textSecondary }]}>
            Theme
          </ThemedText>
          <ThemeSwitcher />
        </View>
      </Card>

      {/* Notifications (placeholder v1 — no DB table yet) -------------------- */}
      <Card>
        <ThemedText style={[styles.cardTitle, { color: tokens.text }]}>Notifications</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          Alert emails are sent to{' '}
          <ThemedText type="small" style={{ color: tokens.text }}>
            {email}
          </ThemedText>
          .
        </ThemedText>
        <View style={styles.alertList}>
          <AlertRow label="New waitlist signups" />
          <AlertRow label="New contact messages" />
        </View>
        <ThemedText type="small" style={[styles.footnote, { color: tokens.textSecondary }]}>
          Always-on for now. Per-alert toggles are on the roadmap.
        </ThemedText>
      </Card>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const { tokens } = useAdminTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {children}
    </View>
  );
}

function AlertRow({ label }: { label: string }) {
  const { tokens } = useAdminTheme();
  return (
    <View style={styles.alertRow}>
      <ThemedText style={[styles.alertCheck, { color: tokens.accent }]}>✓</ThemedText>
      <ThemedText style={{ color: tokens.text }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  head: { gap: Spacing.half, marginBottom: Spacing.one },
  title: { fontSize: 22, fontWeight: '800' },
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.one },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  profileName: { fontSize: 18, fontWeight: '600' },
  action: { alignSelf: 'flex-start', marginTop: Spacing.half },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.half,
    flexWrap: 'wrap',
  },
  themeLabel: { fontWeight: '600' },
  alertList: { gap: Spacing.half, marginTop: Spacing.half },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  alertCheck: { fontWeight: '800' },
  footnote: { fontStyle: 'italic', marginTop: Spacing.half },
  error: { color: Functional.error },
});
