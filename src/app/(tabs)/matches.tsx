import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { signProfilePhotos } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

type MatchRow = { matchId: string; name: string | null; photo?: string };

export default function Matches() {
  const router = useRouter();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('id').maybeSingle();
    const myId = prof?.id as string | undefined;
    if (!myId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: matches } = await supabase
      .from('matches')
      .select('id, profile_a, profile_b, created_at')
      .order('created_at', { ascending: false });
    const ms = matches ?? [];
    const otherIds = ms.map((m) => (m.profile_a === myId ? m.profile_b : m.profile_a));

    const nameById: Record<string, string | null> = {};
    if (otherIds.length) {
      const { data: pps } = await supabase
        .from('public_profiles')
        .select('id, display_name')
        .in('id', otherIds);
      (pps ?? []).forEach((p) => {
        nameById[p.id as string] = (p.display_name as string | null) ?? null;
      });
    }
    const photoMap = await signProfilePhotos(otherIds);

    setRows(
      ms.map((m) => {
        const otherId = m.profile_a === myId ? m.profile_b : m.profile_a;
        return {
          matchId: m.id as string,
          name: nameById[otherId] ?? null,
          photo: photoMap[otherId]?.[0],
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <ScreenShell title="Matches">
        <ActivityIndicator color={Brand.red} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Matches"
      subtitle={rows.length ? 'Tap a match to open the chat.' : undefined}
      note={
        rows.length
          ? undefined
          : 'No matches yet — like people in your deck. When you both like each other, they appear here. (Real-time messaging arrives in step 6.)'
      }
    >
      {rows.map((r) => (
        <Pressable key={r.matchId} onPress={() => router.push(`/chat/${r.matchId}`)}>
          <ThemedView type="backgroundElement" style={styles.row}>
            {r.photo ? (
              <Image source={{ uri: r.photo }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.noAvatar]} />
            )}
            <ThemedText style={styles.name}>{r.name ?? 'Gooner'}</ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.card,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  noAvatar: { backgroundColor: '#26282C' },
  name: { fontSize: 18, fontWeight: '600' },
});
