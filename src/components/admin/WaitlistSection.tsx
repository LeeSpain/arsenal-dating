import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Row = { id: string; email: string; created_at: string; source: string | null };

// NEW in the Control Centre: admin-only listing of waitlist signups + a CSV
// export, plus client-side search, inline email edit, and delete. The admin RLS
// policies (SELECT added by 20260527090000_admin_waitlist_select.sql;
// DELETE/UPDATE by *_admin_crud.sql) are the real gate; this UI just consumes
// them. Surfaces themed per AdminTheme.
const PAGE_LIMIT = 1000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function WaitlistSection() {
  const { tokens } = useAdminTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, search]);

  function startEdit(r: Row) {
    setConfirmDeleteId(null);
    setActionError(null);
    setEditError(null);
    setEditingId(r.id);
    setEditEmail(r.email);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    const value = editEmail.trim().toLowerCase();
    if (value.length > 200 || !EMAIL_RE.test(value)) {
      setEditError('That email doesn’t look right.');
      return;
    }
    setBusyId(id);
    setEditError(null);
    const { error: upErr } = await supabase.from('waitlist').update({ email: value }).eq('id', id);
    setBusyId(null);
    if (upErr) {
      setEditError('Could not save that change.');
      return;
    }
    setEditingId(null);
    await load();
  }

  function startDelete(r: Row) {
    setEditingId(null);
    setActionError(null);
    setConfirmDeleteId(r.id);
  }

  async function confirmDelete(id: string) {
    setBusyId(id);
    setActionError(null);
    const { error: delErr } = await supabase.from('waitlist').delete().eq('id', id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (delErr) {
      setActionError('Could not delete that signup.');
      return;
    }
    await load();
  }

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

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by email…"
        placeholderTextColor={tokens.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search waitlist by email"
        style={[
          styles.search,
          { color: tokens.text, backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      />

      {actionError ? <ThemedText style={styles.error}>{actionError}</ThemedText> : null}

      {loading ? <ActivityIndicator color={Brand.red} /> : null}
      {!loading && rows.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>No signups yet.</ThemedText>
      ) : null}
      {!loading && rows.length > 0 && filtered.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>No signups match your search.</ThemedText>
      ) : null}

      {filtered.map((r) => {
        const isEditing = editingId === r.id;
        const isConfirming = confirmDeleteId === r.id;
        const busy = busyId === r.id;
        return (
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
            <View style={styles.rowTop}>
              <View style={styles.rowMain}>
                {isEditing ? (
                  <TextInput
                    value={editEmail}
                    onChangeText={setEditEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!busy}
                    accessibilityLabel="Edit email"
                    style={[
                      styles.editInput,
                      { color: tokens.text, backgroundColor: tokens.bg, borderColor: tokens.border },
                    ]}
                  />
                ) : (
                  <ThemedText style={[styles.email, { color: tokens.text }]}>{r.email}</ThemedText>
                )}
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

            {isEditing && editError ? (
              <ThemedText type="small" style={styles.error}>
                {editError}
              </ThemedText>
            ) : null}

            <View style={styles.rowActions}>
              {busy ? (
                <ActivityIndicator color={Brand.red} />
              ) : isEditing ? (
                <>
                  <TextButton label="Save" color={tokens.accent} onPress={() => saveEdit(r.id)} />
                  <TextButton label="Cancel" color={tokens.textSecondary} onPress={cancelEdit} />
                </>
              ) : isConfirming ? (
                <>
                  <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                    Delete this signup?
                  </ThemedText>
                  <TextButton
                    label="Confirm"
                    color={tokens.attention}
                    onPress={() => confirmDelete(r.id)}
                  />
                  <TextButton
                    label="Cancel"
                    color={tokens.textSecondary}
                    onPress={() => setConfirmDeleteId(null)}
                  />
                </>
              ) : (
                <>
                  <TextButton label="Edit" color={tokens.accent} onPress={() => startEdit(r)} />
                  <TextButton label="Delete" color={tokens.attention} onPress={() => startDelete(r)} />
                </>
              )}
            </View>
          </View>
        );
      })}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

// Lightweight themed text button for per-row actions (Edit / Delete / Save …).
function TextButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
    >
      <ThemedText type="small" style={{ color, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  head: { gap: Spacing.half, marginBottom: Spacing.one },
  title: { fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  exportBtn: { flexShrink: 1, minWidth: 140 },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    fontSize: 15,
  },
  row: {
    padding: Spacing.two,
    borderRadius: Radius.card,
    gap: Spacing.one,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  rowMain: { flex: 1, gap: 2 },
  email: { fontSize: 15, fontWeight: '600' },
  editInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: Spacing.one,
    fontSize: 15,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Radius.input,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourceBadgeText: { fontFamily: 'monospace' },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  textBtn: { paddingVertical: 2 },
  textBtnPressed: { opacity: 0.6 },
  error: { color: Functional.error },
});
