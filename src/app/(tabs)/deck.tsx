import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenShell } from '@/components/screen-shell';
import { SwipeCard } from '@/components/swipe-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { type DeckCard, getDeck, sharedTrait, signDeckPhotos, swipe } from '@/lib/deck';
import { supabase } from '@/lib/supabase';

type Mine = { era: string | null; manager: string | null; players: string[] };

function DeckFrame({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['bottom']}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

export default function Deck() {
  const router = useRouter();
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [myId, setMyId] = useState<string | null>(null);
  const [mine, setMine] = useState<Mine>({ era: null, manager: null, players: [] });
  const [loading, setLoading] = useState(true);
  const [matchCard, setMatchCard] = useState<DeckCard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('id').maybeSingle();
    const pid = (prof?.id as string) ?? null;
    setMyId(pid);
    if (pid) {
      const { data: q } = await supabase
        .from('questionnaire')
        .select('favourite_era, favourite_manager, favourite_players')
        .eq('profile_id', pid)
        .maybeSingle();
      setMine({
        era: q?.favourite_era ?? null,
        manager: q?.favourite_manager ?? null,
        players: q?.favourite_players ?? [],
      });
    }
    const deck = await getDeck(40, 0);
    setPhotoMap(await signDeckPhotos(deck));
    setCards(deck);
    setIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(dir: 'like' | 'pass') {
    const card = cards[index];
    if (!card) return;
    setIndex((i) => i + 1);
    if (!myId) return;
    try {
      const matched = await swipe(myId, card.id, dir);
      if (matched) setMatchCard(card);
    } catch {
      // ignore (e.g. duplicate); card already advanced
    }
  }

  const current = cards[index];
  const topPhoto = current?.photo_urls?.[0];

  if (loading) {
    return (
      <DeckFrame>
        <View style={styles.center}>
          <ActivityIndicator color={Brand.red} />
        </View>
      </DeckFrame>
    );
  }

  if (!current) {
    return (
      <ScreenShell
        title="That's everyone near you for now"
        subtitle="New Gooners join all the time — check back soon."
        note="Your deck widens automatically when matches are thin (a bit further away, then wider ages). It never overrides your gender preference, never shows people you've already swiped, and questionnaire answers never remove anyone."
      >
        <PrimaryButton label="Refresh deck" onPress={load} />
      </ScreenShell>
    );
  }

  return (
    <DeckFrame>
      <View style={styles.stack}>
        <SwipeCard
          key={current.id}
          card={current}
          photoUrl={topPhoto ? photoMap[topPhoto] : undefined}
          sharedTrait={sharedTrait(mine, current)}
          onDecide={decide}
        />
      </View>
      <View style={styles.buttons}>
        <PrimaryButton label="Pass" variant="secondary" onPress={() => decide('pass')} style={styles.btn} />
        <PrimaryButton label="Like" onPress={() => decide('like')} style={styles.btn} />
      </View>

      {matchCard ? (
        <View style={styles.overlay}>
          <ThemedView style={styles.matchBox}>
            <ThemedText style={styles.matchTitle}>It’s a match!</ThemedText>
            {matchCard.photo_urls?.[0] && photoMap[matchCard.photo_urls[0]] ? (
              <Image
                source={{ uri: photoMap[matchCard.photo_urls[0]] }}
                style={styles.matchPhoto}
                contentFit="cover"
              />
            ) : null}
            <ThemedText themeColor="textSecondary">
              You and {matchCard.display_name} both liked each other.
            </ThemedText>
            <PrimaryButton
              label="Go to matches"
              onPress={() => {
                setMatchCard(null);
                router.push('/matches');
              }}
            />
            <PrimaryButton label="Keep swiping" variant="secondary" onPress={() => setMatchCard(null)} />
          </ThemedView>
        </View>
      ) : null}
    </DeckFrame>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stack: { flex: 1, padding: Spacing.two },
  buttons: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingBottom: Spacing.two },
  btn: { flex: 1 },
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
  matchBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  matchTitle: { fontSize: 28, fontWeight: '800', color: Brand.red },
  matchPhoto: { width: 140, height: 175, borderRadius: Radius.card },
});
