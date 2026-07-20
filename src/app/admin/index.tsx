import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminNav, type AdminSection, WIDE_BREAKPOINT } from '@/components/admin/AdminNav';
import {
  AdminThemeProvider,
  useAdminTheme,
} from '@/components/admin/AdminThemeContext';
import { KitReviewSection } from '@/components/admin/KitReviewSection';
import { MaintenanceSection } from '@/components/admin/MaintenanceSection';
import { MessagesSection } from '@/components/admin/MessagesSection';
import { OverviewSection } from '@/components/admin/OverviewSection';
import { ReportsSection } from '@/components/admin/ReportsSection';
import { SettingsSection } from '@/components/admin/SettingsSection';
import { WaitlistSection } from '@/components/admin/WaitlistSection';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Brand, FontSize, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Admin Control Centre. Single-page admin UI optimised for desktop: sidebar
// nav at >=1024px, horizontal tab strip below. DesktopShell opts out of its
// phone frame on this route so the layout gets the full viewport width.
//
// Theming is admin-scoped — see AdminThemeContext. The rest of the app is
// unaffected.
//
// Authorization model unchanged: every action this page exposes (kit-review,
// report-review, purge-orphans, founder_messages SELECT/UPDATE, waitlist
// SELECT, admin-stats) is enforced server-side via is_admin. The cosmetic
// gate below just hides the UI from non-admins.
export default function AdminControlCentre() {
  return (
    <AdminThemeProvider>
      <AdminControlCentreInner />
    </AdminThemeProvider>
  );
}

function AdminControlCentreInner() {
  const router = useRouter();
  const { session, profileStatus, loading } = useSession();
  const { width } = useWindowDimensions();
  const isDesktop = width >= WIDE_BREAKPOINT;
  const { tokens } = useAdminTheme();

  const [section, setSection] = useState<AdminSection>('overview');
  const [badges, setBadges] = useState<Partial<Record<AdminSection, number>>>({});
  // UI-only PIN lock. Kept in component state on purpose (no AsyncStorage /
  // storage.ts) so it re-prompts on every fresh load or refresh. This gates the
  // UI only — server-side is_admin authorization is unchanged.
  const [unlocked, setUnlocked] = useState(false);

  // Lightweight count pings for the nav badges. RLS gives admins access; for
  // non-admins this resolves to zeros so it's safe to run unguarded after the
  // outer is_admin check below.
  useEffect(() => {
    if (!profileStatus?.isAdmin) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('founder_messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (cancelled) return;
      setBadges({ messages: count ?? 0 });
    })();
    return () => {
      cancelled = true;
    };
  }, [profileStatus?.isAdmin]);

  if (loading) {
    return (
      <ScreenShell title="Admin Control Centre">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }
  // Logged out entirely: send them to sign in, then bounce back to /admin.
  // (A real non-admin who IS logged in still hits the refusal gate below.)
  if (!session) {
    return <Redirect href="/sign-in?returnTo=/admin" />;
  }
  if (!profileStatus?.isAdmin) {
    return (
      <View style={[styles.gateRoot, { backgroundColor: tokens.bg }]}>
        <ScreenShell title="Admin Control Centre">
          <ThemedText style={{ color: tokens.textSecondary }}>
            You don’t have access to this.
          </ThemedText>
          <PrimaryButton label="Back" variant="secondary" onPress={() => router.replace('/')} />
        </ScreenShell>
      </View>
    );
  }

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  const SectionView = (() => {
    switch (section) {
      case 'overview':
        return <OverviewSection />;
      case 'messages':
        return <MessagesSection />;
      case 'waitlist':
        return <WaitlistSection />;
      case 'kit':
        return <KitReviewSection />;
      case 'reports':
        return <ReportsSection />;
      case 'maintenance':
        return <MaintenanceSection />;
      case 'settings':
        return <SettingsSection />;
    }
  })();

  return (
    <View style={[styles.fill, { backgroundColor: tokens.bg }]}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={[styles.layout, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
          <AdminNav current={section} onSelect={setSection} badges={badges} />
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
          >
            {SectionView}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const ADMIN_PIN = '090909';
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

// In-memory PIN gate. State lives here (not in storage) so it re-locks on every
// fresh load. Purely cosmetic — see the authorization note above.
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { tokens } = useAdminTheme();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const locked = cooldown > 0;

  // Tick the cooldown down once a second while it's active.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown > 0]);

  const handleUnlock = () => {
    if (locked) return;
    if (pin === ADMIN_PIN) {
      onUnlock();
      return;
    }
    const next = attempts + 1;
    setPin('');
    if (next >= MAX_ATTEMPTS) {
      setAttempts(0);
      setCooldown(COOLDOWN_SECONDS);
      setError(null);
    } else {
      setAttempts(next);
      const left = MAX_ATTEMPTS - next;
      setError(`Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} left.`);
    }
  };

  return (
    <View style={[styles.gateRoot, { backgroundColor: tokens.bg }]}>
      <ScreenShell title="Admin Control Centre">
        <View
          style={[
            styles.pinCard,
            { backgroundColor: tokens.surface, borderColor: tokens.border },
          ]}
        >
          <ThemedText type="section" style={{ color: tokens.text }}>
            Enter admin PIN
          </ThemedText>
          <ThemedText type="small" style={{ color: tokens.textSecondary }}>
            This screen re-locks on every refresh.
          </ThemedText>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!locked}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor={tokens.textSecondary}
            onSubmitEditing={handleUnlock}
            accessibilityLabel="Admin PIN"
            style={[
              styles.pinInput,
              {
                color: tokens.text,
                backgroundColor: tokens.bg,
                borderColor: tokens.border,
              },
            ]}
          />
          {locked ? (
            <ThemedText type="small" style={{ color: tokens.attention }}>
              Too many attempts. Try again in {cooldown}s.
            </ThemedText>
          ) : error ? (
            <ThemedText type="small" style={{ color: tokens.attention }}>
              {error}
            </ThemedText>
          ) : null}
          <PrimaryButton
            label={locked ? `Locked (${cooldown}s)` : 'Unlock'}
            onPress={handleUnlock}
            disabled={locked || pin.length < 6}
          />
        </View>
      </ScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gateRoot: { flex: 1 },
  pinCard: {
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: FontSize.title,
    letterSpacing: 8,
    textAlign: 'center',
  },
  layout: { flex: 1 },
  layoutDesktop: {
    flexDirection: 'row',
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  layoutMobile: { flexDirection: 'column' },
  content: { flex: 1 },
  contentInner: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
