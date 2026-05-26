import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
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

// Founder inbox for messages sent via the landing page. Admin-only; the
// underlying RLS policy on founder_messages enforces this server-side
// regardless of whether this UI guard runs.
export default function Messages() {
  const router = useRouter();
  const { profileStatus, loading } = useSession();
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
    if (profileStatus?.isAdmin) load();
  }, [profileStatus?.isAdmin, load]);

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

  if (loading) {
    return (
      <ScreenShell title="Messages">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }
  if (!profileStatus?.isAdmin) {
    return (
      <ScreenShell title="Messages">
        <ThemedText themeColor="textSecondary">You don’t have access to this.</ThemedText>
        <PrimaryButton label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </ScreenShell>
    );
  }

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <ScreenShell
      title="Messages"
      subtitle={
        items.length === 0
          ? 'Founder inbox · admin-only, enforced server-side.'
          : `${unread} unread · ${items.length} total`
      }
    >
      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText themeColor="textSecondary">No messages yet. 📭</ThemedText>
      ) : null}

      {items.map((m) => {
        const busy = actingId === m.id;
        const when = new Date(m.created_at).toLocaleString();
        return (
          <ThemedView
            key={m.id}
            type="backgroundElement"
            style={[styles.card, !m.is_read && styles.cardUnread]}
          >
            <View style={styles.head}>
              <ThemedText style={styles.name}>
                {!m.is_read ? '● ' : ''}
                {m.sender_name || 'Anonymous'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {when}
              </ThemedText>
            </View>
            {m.sender_email ? (
              <ThemedText type="small" themeColor="textSecondary">
                {m.sender_email}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                no email — you can’t reply
              </ThemedText>
            )}
            <ThemedText style={styles.body}>{m.message}</ThemedText>
            <View style={styles.actions}>
              <PrimaryButton
                label={m.is_read ? 'Mark unread' : 'Mark read'}
                variant="secondary"
                loading={busy}
                onPress={() => toggleRead(m)}
                style={styles.act}
              />
            </View>
          </ThemedView>
        );
      })}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.half },
  cardUnread: { borderColor: Brand.gold, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  body: { marginTop: Spacing.one, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.one },
  act: { flex: 1 },
  error: { color: Functional.error },
});
