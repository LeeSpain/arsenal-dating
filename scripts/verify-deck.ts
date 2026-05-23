// Live step-5 test. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-deck.ts
//
// Proves, in plain terms:
//  1. INCLUSIVE DECK — a zero-answer fan and a fully-answered fan get the SAME
//     people; only the order differs. Prints both decks.
//  2. MATCH creation on mutual like (and none on a one-sided like).
//  3. NEAR-EMPTY relaxation — a viewer with nobody within 25km still gets a deck.
//
// Cohort uses gender 'non_binary' so it can't collide with the founder (man).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}
const LONDON = { name: 'London', lat: 51.5074, lng: -0.1278 };
const TOKYO = { name: 'Tokyo', lat: 35.6762, lng: 139.6503 };
const pw = () => 'Az9!' + crypto.randomUUID();
function ok(m: string) { console.log('  ✓ ' + m); }
function fail(m: string): never { console.error('  ✗ ' + m); process.exit(1); }

type User = { c: SupabaseClient; id: string; name: string };
const everyone: User[] = [];

async function makeUser(opts: {
  name: string; gender: string; interested?: string[];
  era?: string; manager?: string; players?: string[]; since?: number;
  city?: { name: string; lat: number; lng: number }; dist?: number;
}): Promise<User> {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const email = `deck-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data: su, error } = await c.auth.signUp({ email, password: pw() });
  if (error || !su.session) fail(`signUp ${opts.name}: ${error?.message ?? 'no session (auto-confirm off?)'}`);
  const city = opts.city ?? LONDON;
  await c.from('profiles').insert({
    auth_id: su.user!.id, dob: '1995-01-01', display_name: opts.name,
    gender: opts.gender, location: city.name, city_lat: city.lat, city_lng: city.lng,
    onboarding_completed: true,
  });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({
    profile_id: id, min_age: 18, max_age: 99,
    max_distance_km: opts.dist ?? 20000, interested_in_gender: opts.interested ?? [],
  });
  if (opts.era || opts.manager || opts.players || opts.since) {
    await c.from('questionnaire').upsert({
      profile_id: id, favourite_era: opts.era ?? null, favourite_manager: opts.manager ?? null,
      favourite_players: opts.players ?? [], supporting_since: opts.since ?? null,
    });
  }
  const u = { c, id, name: opts.name };
  everyone.push(u);
  return u;
}

async function deckNames(u: User): Promise<string[]> {
  const { data, error } = await u.c.rpc('get_deck', { p_limit: 50, p_offset: 0 });
  if (error) fail(`get_deck for ${u.name}: ${error.message}`);
  return (data ?? []).map((r: any) => r.display_name as string);
}

// ---------------------------------------------------------------------------
console.log('\n1) INCLUSIVE DECK\n');

// Candidates (gender non_binary, all in London), varied questionnaire completeness.
const candA = await makeUser({ name: 'A · Henry/Invincibles/Wenger', gender: 'non_binary', era: 'invincibles', manager: 'wenger', players: ['Henry', 'Bergkamp'] });
const candB = await makeUser({ name: 'B · Invincibles only', gender: 'non_binary', era: 'invincibles' });
const candC = await makeUser({ name: 'C · ZERO answers', gender: 'non_binary' });
const candD = await makeUser({ name: 'D · ZERO answers', gender: 'non_binary' });
const cohort = [candA, candB, candC, candD];
const cohortNames = cohort.map((c) => c.name).sort();

// Two viewers, identical preferences (interested in non_binary), differing only
// in questionnaire answers.
const v0 = await makeUser({ name: 'V0 (zero answers)', gender: 'woman', interested: ['non_binary'] });
const v1 = await makeUser({ name: 'V1 (full answers)', gender: 'woman', interested: ['non_binary'], era: 'invincibles', manager: 'wenger', players: ['Henry', 'Saka'], since: 2004 });

const deck0 = await deckNames(v0);
const deck1 = await deckNames(v1);

console.log('  Zero-answer fan (V0) sees, in order:');
deck0.forEach((n, i) => console.log(`     ${i + 1}. ${n}`));
console.log('  Fully-answered fan (V1) sees, in order:');
deck1.forEach((n, i) => console.log(`     ${i + 1}. ${n}`));

const set0 = [...deck0].sort();
const set1 = [...deck1].sort();
const sameMembership = JSON.stringify(set0) === JSON.stringify(set1) && JSON.stringify(set0) === JSON.stringify(cohortNames);
console.log(`\n  Same set of people in both decks? ${sameMembership ? 'YES' : 'NO'}`);
console.log(`  Both decks include the ZERO-answer candidates (C & D)? ${
  deck0.includes(candC.name) && deck0.includes(candD.name) && deck1.includes(candC.name) && deck1.includes(candD.name) ? 'YES' : 'NO'}`);
const orderDiffers = JSON.stringify(deck0) !== JSON.stringify(deck1);
console.log(`  Order differs between the two fans? ${orderDiffers ? 'YES' : 'NO'}`);
console.log(`  Fully-answered fan's #1 is a shared-trait match (${deck1[0]})? ${deck1[0]?.startsWith('A ·') || deck1[0]?.startsWith('B ·') ? 'YES' : 'NO'}\n`);

if (!sameMembership) fail('membership differs between zero-answer and full-answer fan');
if (!(deck0.includes(candC.name) && deck1.includes(candC.name))) fail('a zero-answer candidate was missing from a deck');
ok('inclusive guarantee: identical membership, questionnaire only reordered');

// Membership must not change when V0 adds answers.
await v0.c.from('questionnaire').upsert({ profile_id: v0.id, favourite_era: 'invincibles', favourite_players: ['Henry'] });
const deck0b = await deckNames(v0);
if (JSON.stringify([...deck0b].sort()) !== JSON.stringify(cohortNames)) fail('membership changed after V0 added answers');
ok('membership unchanged after V0 added answers (only order can change)');

// ---------------------------------------------------------------------------
console.log('\n2) MATCH CREATION\n');
async function like(a: User, b: User) {
  await a.c.from('swipes').insert({ swiper_id: a.id, target_id: b.id, direction: 'like' });
}
async function matchExists(a: User, b: User): Promise<boolean> {
  const { data } = await a.c.from('matches').select('id')
    .or(`and(profile_a.eq.${a.id},profile_b.eq.${b.id}),and(profile_a.eq.${b.id},profile_b.eq.${a.id})`)
    .maybeSingle();
  return !!data;
}
await like(v0, candA);
if (await matchExists(v0, candA)) fail('one-sided like created a match');
ok('one-sided like → no match');
await like(candA, v0);
if (!(await matchExists(v0, candA))) fail('mutual like did NOT create a match');
ok('mutual like → match created');

// ---------------------------------------------------------------------------
console.log('\n3) NEAR-EMPTY RELAXATION\n');
const vFar = await makeUser({ name: 'V-far (Tokyo, 25km)', gender: 'woman', interested: ['non_binary'], city: TOKYO, dist: 25 });
const farDeck = await deckNames(vFar);
console.log(`  Viewer in Tokyo with a 25km limit; nobody is within 25km.`);
console.log(`  Deck still returned ${farDeck.length} people (via progressive relaxation).`);
if (farDeck.length === 0) fail('near-empty viewer got an empty deck instead of relaxed backfill');
ok('thin/near-empty deck backfilled by relaxation rather than going empty');

// ---------------------------------------------------------------------------
console.log('\nCleaning up…');
for (const u of everyone) {
  await u.c.functions.invoke('delete-account', { method: 'POST' });
}
ok(`cleaned up ${everyone.length} throwaway accounts`);
console.log('\nStep 5 verified end-to-end.');
