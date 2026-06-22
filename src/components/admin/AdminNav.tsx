import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';

export type AdminSection =
  | 'overview'
  | 'messages'
  | 'waitlist'
  | 'kit'
  | 'reports'
  | 'maintenance';

const ITEMS: { key: AdminSection; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'messages', label: 'Messages' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'kit', label: 'Kit review' },
  { key: 'reports', label: 'Reports' },
  { key: 'maintenance', label: 'Maintenance' },
];

// Sidebar on desktop (≥1024px), horizontal tabs below. State is owned by the
// parent so the nav is purely presentational + onSelect.
export const WIDE_BREAKPOINT = 1024;

export function AdminNav({
  current,
  onSelect,
  badges = {},
}: {
  current: AdminSection;
  onSelect: (s: AdminSection) => void;
  /** Optional badge counts (e.g. unread/pending) keyed by section. */
  badges?: Partial<Record<AdminSection, number>>;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= WIDE_BREAKPOINT;

  if (isDesktop) {
    return (
      <ThemedView type="backgroundElement" style={styles.sidebar}>
        <ThemedText style={styles.brand}>Admin Control Centre</ThemedText>
        {ITEMS.map((it) => (
          <NavItem
            key={it.key}
            label={it.label}
            badge={badges[it.key]}
            active={current === it.key}
            onPress={() => onSelect(it.key)}
            vertical
          />
        ))}
      </ThemedView>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {ITEMS.map((it) => (
        <NavItem
          key={it.key}
          label={it.label}
          badge={badges[it.key]}
          active={current === it.key}
          onPress={() => onSelect(it.key)}
        />
      ))}
    </ScrollView>
  );
}

function NavItem({
  label,
  badge,
  active,
  onPress,
  vertical,
}: {
  label: string;
  badge?: number;
  active: boolean;
  onPress: () => void;
  vertical?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        vertical ? styles.sidebarItem : styles.tabItem,
        active && (vertical ? styles.sidebarItemActive : styles.tabItemActive),
      ]}
    >
      <ThemedText
        style={[styles.itemLabel, active && styles.itemLabelActive]}
        themeColor={active ? 'text' : 'textSecondary'}
      >
        {label}
      </ThemedText>
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <ThemedText type="small" style={styles.badgeText}>
            {badge}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    padding: Spacing.two,
    borderRadius: Radius.card,
    gap: Spacing.half,
  },
  brand: {
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: Spacing.two,
    opacity: 0.7,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 4,
    borderRadius: Radius.input,
    gap: Spacing.one,
  },
  sidebarItemActive: { backgroundColor: Colors.dark.backgroundSelected },

  tabs: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.one,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.half,
  },
  tabItemActive: { backgroundColor: Colors.dark.backgroundSelected, borderColor: Brand.red },

  itemLabel: { flex: 1, fontSize: 15 },
  itemLabelActive: { fontWeight: '700' },

  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 11,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
