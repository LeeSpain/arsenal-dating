import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, View } from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Row = { id: string; email: string; created_at: string; source: string | null };

// NEW in the Control Centre: admin-only listing of waitlist signups + a CSV
// export. The admin-RLS policy added by 20260527090000_admin_waitlist_select.sql
// is the real gate; this UI just consumes it. Surfaces themed per AdminTheme.
const PAGE_LIMIT = 1000;

export function WaitlistSection() {
  const { tokens } = useAdminTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const { data, error: loadErr, count: c } = await supabase
      .from('waitlist')
      .select('id, email, created_at, source', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT);
    if (loadErr) {
      setError('Could not load the waitlist.');
      setRows([]);
      setCount(null);
    } else {
      setRows((data ?? []) as Row[]);
      setCount(c ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function buildCsv(items: Row[]): string {
    const escape = (v: string | null) => {
      const s = (v ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const header = 'email,source,created_at';
    const body = items.map((r) => `${escape(r.email)},${escape(r.source)},${escape(r.created_at)}`);
    return [header, ...body].join('\n');
  }

  async function onExport() {
    setExportNotice(null);
    const csv = buildCsv(rows);
    const filename = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    try {
      if (Platform.OS === 'web') {
        const w = globalThis as any;
        const blob = new w.Blob([csv], { type: 'text/csv;charset=utf-8' });
        const objectUrl = w.URL.createObjectURL(blob);
        const a = w.document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        a.click();
        w.URL.revokeObjectURL(objectUrl);
      } else {
        await Share.share({ message: csv });
      }
      setExportNotice(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'}.`);
    } catch {
      setExportNotice('Export ready (could not auto-deliver).');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={[styles.title, { color: tokens.text }]}>Waitlist & signups</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          {count === null
            ? 'Admin-only · enforced server-side.'
            : `${count} total${rows.length < (count ?? 0) ? ` · showing latest ${rows.length}` : ''}`}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={`Export CSV${rows.length ? ` (${rows.length})` : ''}`}
          variant="secondary"
          onPress={onExport}
          style={styles.exportBtn}
        />
        <PrimaryButton
          label="Refresh"
          variant="secondary"
          onPress={load}
          style={styles.exportBtn}
        />
      </View>
      {exportNotice ? (
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          {exportNotice}
        </ThemedText>
      ) : null}

      {loading ? <ActivityIndicator color={Brand.red} /> : null}
      {!loading && rows.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>No signups yet.</ThemedText>
      ) : null}

      {rows.map((r) => (
        <View
          key={r.id}
          style={[
            styles.row,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={styles.rowMain}>
            <ThemedText style={[styles.email, { color: tokens.text }]}>{r.email}</ThemedText>
            <ThemedText type="small" style={{ color: tokens.textSecondary }}>
              {new Date(r.created_at).toLocaleString()}
            </ThemedText>
          </View>
          <View style={[styles.sourceBadge, { borderColor: tokens.border, backgroundColor: tokens.surfaceRaised }]}>
            <ThemedText
              type="small"
              style={[styles.sourceBadgeText, { color: tokens.textSecondary }]}
            >
              {r.source ?? '—'}
            </ThemedText>
          </View>
        </View>
      ))}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  head: { gap: Spacing.half, marginBottom: Spacing.one },
  title: { fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  exportBtn: { flexShrink: 1, minWidth: 140 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderRadius: Radius.card,
    gap: Spacing.one,
  },
  rowMain: { flex: 1, gap: 2 },
  email: { fontSize: 15, fontWeight: '600' },
  sourceBadge: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourceBadgeText: { fontFamily: 'monospace' },
  error: { color: Functional.error },
});
