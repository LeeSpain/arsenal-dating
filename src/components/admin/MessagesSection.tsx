import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Msg = {
  id: string;
  created_at: string;
  sender_name: string | null;
  sender_email: string | null;
  message: string;
  is_read: boolean;
  read_at: string | null;
};

// Founder inbox section. RLS on founder_messages already restricts read+update
// to is_admin; this UI just exercises that. Surfaces themed per AdminTheme.
export function MessagesSection() {
  const { tokens } = useAdminTheme();
  const [items, setItems] = useState<Msg[]>([]);
  const [listing, setListing] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setListing(true);
    const { data, error: loadErr } = await supabase
      .from('founder_messages')
      .select('id, created_at, sender_name, sender_email, message, is_read, read_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (loadErr) {
      setError('Could not load messages.');
      setItems([]);
    } else {
      setItems((data ?? []) as Msg[]);
    }
    setListing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleRead(m: Msg) {
    setActingId(m.id);
    setError(null);
    const nextRead = !m.is_read;
    const { error: updateErr } = await supabase
      .from('founder_messages')
      .update({ is_read: nextRead, read_at: nextRead ? new Date().toISOString() : null })
      .eq('id', m.id);
    setActingId(null);
    if (updateErr) {
      setError('Could not update the message.');
      return;
    }
    setItems((prev) =>
      prev.map((x) =>
        x.id === m.id
          ? { ...x, is_read: nextRead, read_at: nextRead ? new Date().toISOString() : null }
          : x,
      ),
    );
  }

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={[styles.title, { color: tokens.text }]}>Founder messages</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          {items.length === 0
            ? 'Admin-only · enforced server-side.'
            : `${unread} unread · ${items.length} total`}
        </ThemedText>
      </View>

      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>No messages yet. 📭</ThemedText>
      ) : null}

      {items.map((m) => {
        const busy = actingId === m.id;
        const when = new Date(m.created_at).toLocaleString();
        return (
          <View
            key={m.id}
            style={[
              styles.card,
              {
                backgroundColor: tokens.surface,
                borderColor: !m.is_read ? tokens.gold : tokens.border,
                borderWidth: !m.is_read ? 1 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.cardHead}>
              <ThemedText style={[styles.name, { color: tokens.text }]}>
                {!m.is_read ? '● ' : ''}
                {m.sender_name || 'Anonymous'}
              </ThemedText>
              <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                {when}
              </ThemedText>
            </View>
            {m.sender_email ? (
              <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                {m.sender_email}
              </ThemedText>
            ) : (
              <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                no email — you can’t reply
              </ThemedText>
            )}
            <ThemedText style={[styles.body, { color: tokens.text }]}>{m.message}</ThemedText>
            <View style={styles.actions}>
              <PrimaryButton
                label={m.is_read ? 'Mark unread' : 'Mark read'}
                variant="secondary"
                loading={busy}
                onPress={() => toggleRead(m)}
                style={styles.act}
              />
            </View>
          </View>
        );
      })}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  head: { gap: Spacing.half, marginBottom: Spacing.one },
  title: { fontSize: 22, fontWeight: '800' },
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.half },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  body: { marginTop: Spacing.one, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.one },
  act: { flex: 1 },
  error: { color: Functional.error },
});
