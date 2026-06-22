import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminNav, type AdminSection, WIDE_BREAKPOINT } from '@/components/admin/AdminNav';
import { KitReviewSection } from '@/components/admin/KitReviewSection';
import { MaintenanceSection } from '@/components/admin/MaintenanceSection';
import { MessagesSection } from '@/components/admin/MessagesSection';
import { OverviewSection } from '@/components/admin/OverviewSection';
import { ReportsSection } from '@/components/admin/ReportsSection';
import { WaitlistSection } from '@/components/admin/WaitlistSection';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Admin Control Centre. Single-page admin UI optimised for desktop: sidebar
// nav at >=1024px, horizontal tab strip below. DesktopShell opts out of its
// phone frame on this route so the layout gets the full viewport width.
//
// Authorization model unchanged: every action this page exposes (kit-review,
// report-review, purge-orphans, founder_messages SELECT/UPDATE, waitlist
// SELECT, admin-stats) is enforced server-side via is_admin. The cosmetic
// gate below just hides the UI from non-admins.
export default function AdminControlCentre() {
  const router = useRouter();
  const { profileStatus, loading } = useSession();
  const { width } = useWindowDimensions();
  const isDesktop = width >= WIDE_BREAKPOINT;

  const [section, setSection] = useState<AdminSection>('overview');
  const [badges, setBadges] = useState<Partial<Record<AdminSection, number>>>({});

  // Lightweight count pings for the nav badges. RLS gives admins access; for
  // non-admins this resolves to zeros so it's safe to run unguarded after the
  // outer is_admin check below.
  useEffect(() => {
    if (!profileStatus?.isAdmin) return;
    let cancelled = false;
    (async () => {
      const [m, _w, _k, _r] = await Promise.all([
        supabase
          .from('founder_messages')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false),
        // Other counts come from admin-stats so we don't duplicate work — keep
        // the nav-badge pings tiny (just unread messages for now). The Overview
        // section fetches the full set.
        Promise.resolve({ count: 0 }),
        Promise.resolve({ count: 0 }),
        Promise.resolve({ count: 0 }),
      ]);
      if (cancelled) return;
      setBadges({ messages: m.count ?? 0 });
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
  if (!profileStatus?.isAdmin) {
    return (
      <ScreenShell title="Admin Control Centre">
        <ThemedText themeColor="textSecondary">You don’t have access to this.</ThemedText>
        <PrimaryButton label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
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
    }
  })();

  return (
    <ThemedView style={styles.fill}>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.dark.background },
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
