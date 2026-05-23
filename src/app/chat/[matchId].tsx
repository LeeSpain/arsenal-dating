import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionGroup } from '@/components/option-group';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Functional, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  type Message,
  firstSenderRole,
  loadMessages,
  sendMessage,
  subscribeMessages,
} from '@/lib/messages';
import { REPORT_REASONS, blockUser, reportUser } from '@/lib/safety';
import { PHOTOS_BUCKET, signedUrl } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

type Other = { id: string; name: string | null; gender: string | null; photo?: string };

export default function Chat() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const listRef = useRef<FlatList<Message>>(null);

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myGender, setMyGender] = useState<string | null>(null);
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showBlock, setShowBlock] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportThenLeave, setReportThenLeave] = useState(false);
  const [reason, setReason] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const addMessage = useCallback((m: Message) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  useEffect(() => {
    if (!matchId) return;
    (async () => {
      const { data: me } = await supabase.from('profiles').select('id, gender').maybeSingle();
      setMyId(me?.id ?? null);
      setMyGender(me?.gender ?? null);

      const { data: match } = await supabase
        .from('matches')
        .select('profile_a, profile_b')
        .eq('id', matchId)
        .maybeSingle();
      if (!match || !me) {
        setValid(false);
        setLoading(false);
        return;
      }
      const otherId = match.profile_a === me.id ? match.profile_b : match.profile_a;
      const { data: op } = await supabase
        .from('public_profiles')
        .select('id, display_name, gender, photo_urls')
        .eq('id', otherId)
        .maybeSingle();
      const path = (op?.photo_urls as string[] | undefined)?.[0];
      setOther({
        id: otherId,
        name: op?.display_name ?? null,
        gender: op?.gender ?? null,
        photo: path ? ((await signedUrl(PHOTOS_BUCKET, path)) ?? undefined) : undefined,
      });
      setMessages(await loadMessages(matchId));
      setLoading(false);
    })();
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !valid) return;
    return subscribeMessages(matchId, addMessage);
  }, [matchId, valid, addMessage]);

  async function onSend() {
    const text = body.trim();
    if (!text || !myId || !matchId) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(matchId, myId, text);
      addMessage(sent);
      setBody('');
    } catch {
      setError('Could not send. Please try again.');
    }
    setSending(false);
  }

  async function doBlock(thenReport: boolean) {
    if (!myId || !other) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await blockUser(myId, other.id);
    } catch {
      setActionBusy(false);
      setActionError('Could not block. Please try again.');
      return;
    }
    setActionBusy(false);
    setShowBlock(false);
    if (thenReport) {
      setReportThenLeave(true);
      setShowReport(true);
    } else {
      router.replace('/matches');
    }
  }

  async function submitReport() {
    if (!myId || !other || reason.length === 0) {
      setActionError('Pick a reason.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await reportUser(myId, other.id, reason[0], details);
    } catch {
      setActionBusy(false);
      setActionError('Could not send the report. Please try again.');
      return;
    }
    setActionBusy(false);
    setShowReport(false);
    setReason([]);
    setDetails('');
    if (reportThenLeave) {
      router.replace('/matches');
    } else {
      setNotice('Report sent to the team. Thanks for keeping it safe.');
    }
  }

  const hasMessages = messages.length > 0;
  const role = firstSenderRole(myGender, other?.gender ?? null);
  const waiting = !hasMessages && role === 'them';
  const name = other?.name ?? 'your match';

  if (loading) {
    return (
      <ThemedView style={styles.fill}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={Brand.red} />
        </SafeAreaView>
      </ThemedView>
    );
  }
  if (!valid) {
    return (
      <ThemedView style={styles.fill}>
        <SafeAreaView style={styles.center}>
          <ThemedText themeColor="textSecondary">This conversation isn’t available.</ThemedText>
          <Pressable onPress={() => router.replace('/matches')}>
            <ThemedText themeColor="accent">Back to matches</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={styles.back}>‹</ThemedText>
          </Pressable>
          {other?.photo ? (
            <Image source={{ uri: other.photo }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.noAvatar]} />
          )}
          <ThemedText style={styles.headerName} numberOfLines={1}>
            {name}
          </ThemedText>
          <Pressable onPress={() => setMenuOpen((o) => !o)} hitSlop={10} style={styles.menuBtn}>
            <ThemedText style={styles.menuDots}>⋯</ThemedText>
          </Pressable>
        </View>

        {/* Report/block seam (stub for step 7) */}
        {menuOpen ? (
          <ThemedView type="backgroundElement" style={[styles.menu, { borderColor: theme.border }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setReportThenLeave(false);
                setShowReport(true);
              }}
            >
              <ThemedText>Report {name}</ThemedText>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setShowBlock(true);
              }}
            >
              <ThemedText>Block {name}</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}
        {notice ? (
          <Pressable onPress={() => setNotice(null)}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
              {notice} (tap to dismiss)
            </ThemedText>
          </Pressable>
        ) : null}

        {/* Thread */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyThread}>
              You matched with {name}.
            </ThemedText>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === myId;
            return (
              <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: Brand.red }
                      : { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText style={{ color: mine ? '#fff' : theme.text }}>{item.body}</ThemedText>
                </View>
              </View>
            );
          }}
        />

        {/* Composer OR calm waiting panel */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {waiting ? (
            <ThemedView type="backgroundElement" style={styles.waitingPanel}>
              <ThemedText style={styles.waitingTitle}>It’s {name}’s move.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.waitingBody}>
                She’ll open the chat when she’s ready — you’ll be able to reply the moment she
                says hi.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={[styles.composerWrap, { borderTopColor: theme.border }]}>
              {!hasMessages ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  {role === 'me'
                    ? `You matched with ${name} — say hello to open the chat.`
                    : `You matched with ${name}. Say hello!`}
                </ThemedText>
              ) : null}
              {error ? (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              ) : null}
              <View style={styles.composer}>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder="Message…"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
                  ]}
                  multiline
                />
                <Pressable
                  onPress={onSend}
                  disabled={sending || !body.trim()}
                  style={[styles.sendBtn, (sending || !body.trim()) && styles.sendDisabled]}
                >
                  <ThemedText style={styles.sendText}>{sending ? '…' : 'Send'}</ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        {showBlock ? (
          <View style={styles.overlay}>
            <ThemedView style={styles.sheet}>
              <ThemedText style={styles.sheetTitle}>Block {name}?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                They won’t be able to see you or contact you, and your match will be removed.
                They get no way back.
              </ThemedText>
              {actionError ? <ThemedText style={styles.error}>{actionError}</ThemedText> : null}
              <PrimaryButton label="Block" loading={actionBusy} onPress={() => doBlock(false)} />
              <PrimaryButton label="Block & report" variant="secondary" onPress={() => doBlock(true)} />
              <PrimaryButton
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowBlock(false);
                  setActionError(null);
                }}
              />
            </ThemedView>
          </View>
        ) : null}

        {showReport ? (
          <View style={styles.overlay}>
            <ThemedView style={styles.sheet}>
              <ThemedText style={styles.sheetTitle}>Report {name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Why are you reporting? This goes to the team.
              </ThemedText>
              <OptionGroup options={REPORT_REASONS} selected={reason} onChange={setReason} />
              <TextField
                label="Details (optional)"
                value={details}
                onChangeText={setDetails}
                multiline
                placeholder="Anything that helps us review"
                style={styles.detailsInput}
              />
              {actionError ? <ThemedText style={styles.error}>{actionError}</ThemedText> : null}
              <PrimaryButton label="Send report" loading={actionBusy} onPress={submitReport} />
              <PrimaryButton
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowReport(false);
                  setActionError(null);
                  setReportThenLeave(false);
                }}
              />
            </ThemedView>
          </View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { fontSize: 32, lineHeight: 32, width: 24 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  noAvatar: { backgroundColor: '#26282C' },
  headerName: { flex: 1, fontSize: 18, fontWeight: '700' },
  menuBtn: { paddingHorizontal: Spacing.one },
  menuDots: { fontSize: 24, fontWeight: '700' },
  menu: {
    position: 'absolute',
    right: Spacing.two,
    top: 56,
    zIndex: 10,
    borderWidth: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  notice: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  thread: { padding: Spacing.two, gap: Spacing.one, flexGrow: 1 },
  emptyThread: { textAlign: 'center', marginTop: Spacing.four },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.card },
  waitingPanel: { margin: Spacing.two, padding: Spacing.three, borderRadius: Radius.card, gap: Spacing.one },
  waitingTitle: { fontSize: 16, fontWeight: '700' },
  waitingBody: { lineHeight: 20 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, padding: Spacing.two, gap: Spacing.one },
  hint: { paddingHorizontal: Spacing.half },
  error: { color: Functional.error },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.two,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  sendBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '700' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  detailsInput: { minHeight: 72, paddingTop: Spacing.one, textAlignVertical: 'top' },
});
