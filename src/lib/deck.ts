import { PHOTOS_BUCKET, signedUrls } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// One deck card = the public-safe fields from get_deck (+ computed distance).
export type DeckCard = {
  id: string;
  display_name: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  looking_for: string | null;
  location: string | null;
  kit_verified: boolean;
  photo_urls: string[];
  favourite_players: string[] | null;
  favourite_era: string | null;
  favourite_manager: string | null;
  supporting_since: number | null;
  distance_km: number | null;
};

/** Fetch the deck for the current user (membership/order handled in SQL). */
export async function getDeck(limit = 40, offset = 0): Promise<DeckCard[]> {
  const { data, error } = await supabase.rpc('get_deck', { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as DeckCard[];
}

/** Sign every card's photo paths in one batch; returns paths->signed map. */
export async function signDeckPhotos(cards: DeckCard[]): Promise<Record<string, string>> {
  const all = Array.from(new Set(cards.flatMap((c) => c.photo_urls ?? [])));
  return signedUrls(PHOTOS_BUCKET, all);
}

/** Record a swipe; on a like, returns whether it produced a match. */
export async function swipe(
  myProfileId: string,
  targetId: string,
  direction: 'like' | 'pass',
): Promise<boolean> {
  const { error } = await supabase
    .from('swipes')
    .insert({ swiper_id: myProfileId, target_id: targetId, direction });
  if (error && !error.message.toLowerCase().includes('duplicate')) throw error;
  if (direction !== 'like') return false;

  // The match trigger runs in the same transaction as the insert; check for it.
  const { data } = await supabase
    .from('matches')
    .select('id')
    .or(
      `and(profile_a.eq.${myProfileId},profile_b.eq.${targetId}),` +
        `and(profile_a.eq.${targetId},profile_b.eq.${myProfileId})`,
    )
    .maybeSingle();
  return !!data;
}

/** A short "you both…" line from shared questionnaire traits, or null. */
export function sharedTrait(
  mine: { era: string | null; manager: string | null; players: string[] },
  card: DeckCard,
): string | null {
  if (mine.era && mine.era === card.favourite_era) return 'You share a favourite era';
  const player = mine.players.find((p) =>
    (card.favourite_players ?? []).some((q) => q.toLowerCase() === p.toLowerCase()),
  );
  if (player) return `You both rate ${player}`;
  if (mine.manager && mine.manager === card.favourite_manager) return 'You share a favourite manager';
  return null;
}
