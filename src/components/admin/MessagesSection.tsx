import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
  archived: boolean;
  replied_at: string | null;
};

type Reply = { id: string; message_id: string; body: string; sent_at: string };

// Founder inbox section. RLS on founder_messages already restricts read/update/
// delete to is_admin (SELECT/UPDATE from 20260526120000_founder_messages.sql;
// DELETE + archived/replied_at columns + founder_message_replies from
// *_admin_crud.sql). Replies are sent by the admin-message-reply Edge Function.
// This UI just exercises those. Surfaces themed per AdminTheme.
export function MessagesSection() {
  const { tokens } = useAdminTheme();
  const [items, setItems] = useState<Msg[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [listing, setListing] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySendingId, setReplySendingId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setListing(true);
    const { data, error: loadErr } = await supabase
      .from('founder_messages')
      .select(
        'id, created_at, sender_name, sender_email, message, is_read, read_at, archived, replied_at',
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (loadErr) {
      setError('Could not load messages.');
      setItems([]);
      setReplies({});
      setListing(false);
      return;
    }
    const msgs = (data ?? []) as Msg[];
    setItems(msgs);

    // Pull any replies for the loaded messages, grouped by message.
    const ids = msgs.map((m) => m.id);
    const map: Record<string, Reply[]> = {};
    if (ids.length) {
      const { data: rd } = await supabase
        .from('founder_message_replies')
        .select('id, message_id, body, sent_at')
        .in('message_id', ids)
        .order('sent_at', { ascending: true });
      for (const r of (rd ?? []) as Reply[]) {
        (map[r.message_id] ??= []).push(r);
      }
    }
    setReplies(map);
    setListing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (!showArchived && m.archived) return false;
      if (!q) return true;
      return (
        (m.sender_name ?? '').toLowerCase().includes(q) ||
        (m.sender_email ?? '').toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [items, search, showArchived]);

  async function toggleRead(m: Msg) {
    setActingId(m.id);
    setError(null);
    const nextRead = !m.is_read;
    const readAt = nextRead ? new Date().toISOString() : null;
    const { error: updateErr } = await supabase
      .from('founder_messages')
      .update({ is_read: nextRead, read_at: readAt })
      .eq('id', m.id);
    setActingId(null);
    if (updateErr) {
      setError('Could not update the message.');
      return;
    }
    setItems((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, is_read: nextRead, read_at: readAt } : x)),
    );
  }

  async function toggleArchive(m: Msg) {
    setActingId(m.id);
    setError(null);
    const next = !m.archived;
    const { error: updateErr } = await supabase
      .from('founder_messages')
      .update({ archived: next })
      .eq('id', m.id);
    setActingId(null);
    if (updateErr) {
      setError('Could not update the message.');
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, archived: next } : x)));
  }

  async function confirmDelete(id: string) {
    setActingId(id);
    setError(null);
    const { error: delErr } = await supabase.from('founder_messages').delete().eq('id', id);
    setActingId(null);
    setConfirmDeleteId(null);
    if (delErr) {
      setError('Could not delete the message.');
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function openReply(m: Msg) {
    setConfirmDeleteId(null);
    setReplyError(null);
    setReplyText('');
    setReplyOpenId(m.id);
  }

  async function sendReply(m: Msg) {
    const body = replyText.trim();
    if (!body) {
      setReplyError('Write a reply first.');
      return;
    }
    setReplySendingId(m.id);
    setReplyError(null);
    const { error: fnErr } = await supabase.functions.invoke('admin-message-reply', {
      body: { messageId: m.id, body },
    });
    setReplySendingId(null);
    if (fnErr) {
      setReplyError('Could not send the reply — please try again.');
      return;
    }
    setReplyOpenId(null);
    setReplyText('');
    await load(); // reflect the new reply + replied_at / read state
  }

  const unread = items.filter((i) => !i.is_read && !i.archived).length;
  const archivedCount = items.filter((i) => i.archived).length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ThemedText style={[styles.title, { color: tokens.text }]}>Founder messages</ThemedText>
        <ThemedText type="small" style={{ color: tokens.textSecondary }}>
          {items.length === 0
            ? 'Admin-only · enforced server-side.'
            : `${unread} unread · ${items.length} total${archivedCount ? ` · ${archivedCount} archived` : ''}`}
        </ThemedText>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, email or message…"
        placeholderTextColor={tokens.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search messages"
        style={[
          styles.search,
          { color: tokens.text, backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      />

      <View style={styles.topActions}>
        <TextButton
          label={showArchived ? 'Hide archived' : `Show archived${archivedCount ? ` (${archivedCount})` : ''}`}
          color={tokens.accent}
          onPress={() => setShowArchived((v) => !v)}
        />
      </View>

      {listing ? <ActivityIndicator color={Brand.red} /> : null}
      {!listing && items.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>No messages yet. 📭</ThemedText>
      ) : null}
      {!listing && items.length > 0 && visible.length === 0 ? (
        <ThemedText style={{ color: tokens.textSecondary }}>
          {search.trim() ? 'No messages match your search.' : 'No messages to show.'}
        </ThemedText>
      ) : null}

      {visible.map((m) => {
        const busy = actingId === m.id;
        const when = new Date(m.created_at).toLocaleString();
        const isConfirming = confirmDeleteId === m.id;
        const isReplying = replyOpenId === m.id;
        const sending = replySendingId === m.id;
        const msgReplies = replies[m.id] ?? [];
        return (
          <View
            key={m.id}
            style={[
              styles.card,
              {
                backgroundColor: tokens.surface,
                borderColor: !m.is_read ? tokens.gold : tokens.border,
                borderWidth: !m.is_read ? 1 : StyleSheet.hairlineWidth,
                opacity: m.archived ? 0.7 : 1,
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

            {(m.archived || m.replied_at) ? (
              <View style={styles.badges}>
                {m.replied_at ? (
                  <ThemedText type="small" style={{ color: tokens.gold }}>
                    ✦ Replied {new Date(m.replied_at).toLocaleDateString()}
                  </ThemedText>
                ) : null}
                {m.archived ? (
                  <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                    · Archived
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            {msgReplies.length ? (
              <View style={[styles.replies, { borderColor: tokens.border }]}>
                {msgReplies.map((r) => (
                  <View key={r.id} style={styles.replyItem}>
                    <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                      You · {new Date(r.sent_at).toLocaleString()}
                    </ThemedText>
                    <ThemedText style={{ color: tokens.text }}>{r.body}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            {isReplying ? (
              <View style={styles.replyComposer}>
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Write your reply…"
                  placeholderTextColor={tokens.textSecondary}
                  editable={!sending}
                  multiline
                  accessibilityLabel="Reply message"
                  style={[
                    styles.replyInput,
                    { color: tokens.text, backgroundColor: tokens.bg, borderColor: tokens.border },
                  ]}
                />
                {replyError ? (
                  <ThemedText type="small" style={styles.error}>
                    {replyError}
                  </ThemedText>
                ) : null}
                <View style={styles.rowActions}>
                  {sending ? (
                    <ActivityIndicator color={Brand.red} />
                  ) : (
                    <>
                      <TextButton label="Send" color={tokens.accent} onPress={() => sendReply(m)} />
                      <TextButton
                        label="Cancel"
                        color={tokens.textSecondary}
                        onPress={() => setReplyOpenId(null)}
                      />
                    </>
                  )}
                </View>
              </View>
            ) : null}

            <View style={styles.rowActions}>
              {busy ? (
                <ActivityIndicator color={Brand.red} />
              ) : isConfirming ? (
                <>
                  <ThemedText type="small" style={{ color: tokens.textSecondary }}>
                    Delete this message?
                  </ThemedText>
                  <TextButton
                    label="Confirm"
                    color={tokens.attention}
                    onPress={() => confirmDelete(m.id)}
                  />
                  <TextButton
                    label="Cancel"
                    color={tokens.textSecondary}
                    onPress={() => setConfirmDeleteId(null)}
                  />
                </>
              ) : (
                <>
                  <TextButton
                    label={m.is_read ? 'Mark unread' : 'Mark read'}
                    color={tokens.accent}
                    onPress={() => toggleRead(m)}
                  />
                  {m.sender_email && !isReplying ? (
                    <TextButton label="Reply" color={tokens.accent} onPress={() => openReply(m)} />
                  ) : null}
                  <TextButton
                    label={m.archived ? 'Unarchive' : 'Archive'}
                    color={tokens.textSecondary}
                    onPress={() => toggleArchive(m)}
                  />
                  <TextButton
                    label="Delete"
                    color={tokens.attention}
                    onPress={() => {
                      setReplyOpenId(null);
                      setConfirmDeleteId(m.id);
                    }}
                  />
                </>
              )}
            </View>
          </View>
        );
      })}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <PrimaryButton label="Refresh" variant="secondary" onPress={load} />
    </View>
  );
}

// Lightweight themed text button for per-row / per-card actions.
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
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    fontSize: 15,
  },
  topActions: { flexDirection: 'row', gap: Spacing.two },
  card: { padding: Spacing.two, borderRadius: Radius.card, gap: Spacing.half },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  body: { marginTop: Spacing.one, lineHeight: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half, marginTop: Spacing.half },
  replies: {
    marginTop: Spacing.one,
    borderLeftWidth: 2,
    paddingLeft: Spacing.two,
    gap: Spacing.one,
  },
  replyItem: { gap: 2 },
  replyComposer: { marginTop: Spacing.one, gap: Spacing.one },
  replyInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  textBtn: { paddingVertical: 2 },
  textBtnPressed: { opacity: 0.6 },
  error: { color: Functional.error },
});
