import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

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

// Sidebar on desktop (>=1024px), horizontal tabs below. State is owned by the
// parent so the nav is purely presentational + onSelect. All surface colours
// come from the admin theme — the badge stays brand-red across all themes
// (count notifications are intentionally consistent).
export const WIDE_BREAKPOINT = 1024;

export function AdminNav({
  current,
  onSelect,
  badges = {},
}: {
  current: AdminSection;
  onSelect: (s: AdminSection) => void;
  badges?: Partial<Record<AdminSection, number>>;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= WIDE_BREAKPOINT;
  const { tokens } = useAdminTheme();

  if (isDesktop) {
    return (
      <View
        style={[
          styles.sidebar,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <ThemedText style={[styles.brand, { color: tokens.textSecondary }]}>
          Admin Control Centre
        </ThemedText>
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
      </View>
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
  const { tokens } = useAdminTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        vertical ? styles.sidebarItem : styles.tabItem,
        !vertical && { borderColor: tokens.border },
        active &&
          (vertical
            ? { backgroundColor: tokens.navItemSelectedBg }
            : {
                backgroundColor: tokens.navItemSelectedBg,
                borderColor: tokens.accent,
              }),
      ]}
    >
      <ThemedText
        style={[
          styles.itemLabel,
          { color: active ? tokens.navItemSelectedText : tokens.textSecondary },
          active && styles.itemLabelActive,
        ]}
      >
        {label}
      </ThemedText>
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: tokens.accent }]}>
          <ThemedText type="small" style={[styles.badgeText, { color: tokens.accentText }]}>
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
    borderWidth: 1,
    gap: Spacing.half,
  },
  brand: {
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: Spacing.two,
    opacity: 0.85,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 4,
    borderRadius: Radius.input,
    gap: Spacing.one,
  },

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
    gap: Spacing.half,
  },

  itemLabel: { flex: 1, fontSize: 15 },
  itemLabelActive: { fontWeight: '700' },

  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '700', fontSize: 11 },
});
