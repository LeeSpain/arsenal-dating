// One-off: seed a few deck profiles so the founder can swipe on web. Two of them
// pre-like the founder, so liking them back fires a match. Cleaned up after.
//   node --experimental-strip-types --env-file=.env scripts/seed-deck.ts
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const FOUNDER_ID = 'a696797c-bb72-4db5-9331-7be0bc495381'; // ArsenalBoss

const LONDON = { name: 'London', lat: 51.5074, lng: -0.1278 };
const BRIGHTON = { name: 'Brighton', lat: 50.8225, lng: -0.1372 };
const MANCHESTER = { name: 'Manchester', lat: 53.4808, lng: -2.2426 };
const pw = () => 'Az9!' + crypto.randomUUID();

type Seed = {
  name: string; age: number; city: { name: string; lat: number; lng: number };
  bio: string; img: string; likesFounder?: boolean;
  era?: string; manager?: string; players?: string[]; since?: number;
};

const seeds: Seed[] = [
  { name: 'Saka Stan', age: 27, city: LONDON, bio: 'Emirates regular. COYG.', img: 'assets/images/react-logo.png', likesFounder: true, era: 'arteta', players: ['Saka', 'Ødegaard'], since: 2016 },
  { name: 'Invincible at Heart', age: 31, city: LONDON, bio: '03/04 forever.', img: 'assets/images/expo-logo.png', likesFounder: true, era: 'invincibles', manager: 'wenger', players: ['Henry', 'Bergkamp'], since: 2002 },
  { name: 'New Gooner', age: 24, city: BRIGHTON, bio: 'Just getting into it!', img: 'assets/images/logo-glow.png' }, // zero answers
  { name: 'Highbury Heart', age: 29, city: MANCHESTER, bio: 'Miss the old ground.', img: 'assets/images/icon.png', era: 'highbury' },
];

for (const s of seeds) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const email = `deck-seed-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data: su, error } = await c.auth.signUp({ email, password: pw() });
  if (error || !su.session) {
    console.error('signup failed (auto-confirm off?):', error?.message);
    process.exit(1);
  }
  const uid = su.user!.id;
  await c.from('profiles').insert({
    auth_id: uid, dob: `${2026 - s.age}-06-15`, display_name: s.name, gender: 'woman',
    bio: s.bio, location: s.city.name, city_lat: s.city.lat, city_lng: s.city.lng,
    onboarding_completed: true,
  });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({
    profile_id: id, min_age: 18, max_age: 99, max_distance_km: 20000, interested_in_gender: ['man'],
  });
  if (s.era || s.manager || s.players || s.since) {
    await c.from('questionnaire').upsert({
      profile_id: id, favourite_era: s.era ?? null, favourite_manager: s.manager ?? null,
      favourite_players: s.players ?? [], supporting_since: s.since ?? null,
    });
  }
  const buf = readFileSync(s.img);
  const path = `${uid}/photo.png`;
  const upRes = await c.storage.from('photos').upload(path, buf, { contentType: 'image/png', upsert: true });
  if (upRes.error) console.error('  photo upload failed:', upRes.error.message);
  await c.from('photos').insert({ profile_id: id, url: path, is_primary: true });
  if (s.likesFounder) {
    await c.from('swipes').insert({ swiper_id: id, target_id: FOUNDER_ID, direction: 'like' });
  }
  console.log(`seeded: ${s.name}  (${email})${s.likesFounder ? '  [pre-liked you]' : ''}`);
}

console.log('\nDone. Refresh the app and open the Deck tab.');
