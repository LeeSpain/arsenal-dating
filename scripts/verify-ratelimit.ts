// Live test for hardening #8. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-ratelimit.ts
//
// Proves: a flood is stopped (31st message, 11th report, 61st deck call, 61st
// sign-photos call), a normal volume sails through, and limits are PER-USER
// (one user hitting a limit doesn't affect anyone else).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const LONDON = { name: 'London', lat: 51.5074, lng: -0.1278 };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const pw = () => 'Az9!' + crypto.randomUUID();
function ok(m: string) { console.log('  ✓ ' + m); }
function fail(m: string): never { console.error('  ✗ ' + m); process.exit(1); }

type User = { c: SupabaseClient; id: string; uid: string; name: string };
const cleanup: User[] = [];
async function makeUser(name: string, gender: string, interested: string[] = []): Promise<User> {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data: su, error } = await c.auth.signUp({ email: `rl-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: pw() });
  if (error || !su.session) fail(`signUp ${name}: ${error?.message ?? 'no session'}`);
  const uid = su.user!.id;
  await c.from('profiles').insert({ auth_id: uid, dob: '1995-01-01', display_name: name, gender, location: LONDON.name, city_lat: LONDON.lat, city_lng: LONDON.lng, onboarding_completed: false });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({ profile_id: id, min_age: 18, max_age: 99, max_distance_km: 20000, interested_in_gender: interested });
  await c.storage.from('photos').upload(`${uid}/x.png`, PNG, { contentType: 'image/png', upsert: true });
  await c.from('photos').insert({ profile_id: id, url: `${uid}/x.png`, is_primary: true });
  await c.from('profiles').update({ onboarding_completed: true }).eq('id', id);
  const u = { c, id, uid, name };
  cleanup.push(u);
  return u;
}

// ===========================================================================
console.log('\nMESSAGES — 30/min/user\n');
const S = await makeUser('S', 'woman', ['man']);
const P = await makeUser('P', 'man', ['woman']);
await S.c.from('swipes').insert({ swiper_id: S.id, target_id: P.id, direction: 'like' });
await P.c.from('swipes').insert({ swiper_id: P.id, target_id: S.id, direction: 'like' });
const { data: mm } = await S.c.from('matches').select('id').or(`and(profile_a.eq.${S.id},profile_b.eq.${P.id}),and(profile_a.eq.${P.id},profile_b.eq.${S.id})`).maybeSingle();
const mId = mm!.id as string;
for (let i = 1; i <= 30; i++) {
  const { error } = await S.c.from('messages').insert({ match_id: mId, sender_id: S.id, body: `m${i}` });
  if (error) fail(`S blocked early at message ${i}: ${error.message}`);
}
ok('first 30 messages from S all sent (normal volume sails through)');
const m31 = await S.c.from('messages').insert({ match_id: mId, sender_id: S.id, body: 'm31' });
if (!m31.error) fail('31st message was NOT throttled');
ok('31st message within the minute → throttled');
const pMsg = await P.c.from('messages').insert({ match_id: mId, sender_id: P.id, body: 'hi from P' });
if (pMsg.error) fail(`per-user broken: P throttled by S's limit: ${pMsg.error.message}`);
ok('per-user: P (the other side) is unaffected and can send');

// ===========================================================================
console.log('\nREPORTS — 10/hour/user\n');
const R = await makeUser('R', 'woman');
const R2 = await makeUser('R2', 'woman');
const T = await makeUser('T', 'man');
for (let i = 1; i <= 10; i++) {
  const { error } = await R.c.from('reports').insert({ reporter_id: R.id, reported_id: T.id, reason: 'spam', status: 'open' });
  if (error) fail(`R blocked early at report ${i}: ${error.message}`);
}
ok('first 10 reports from R all filed');
const r11 = await R.c.from('reports').insert({ reporter_id: R.id, reported_id: T.id, reason: 'spam', status: 'open' });
if (!r11.error) fail('11th report was NOT throttled');
ok('11th report within the hour → throttled');
const r2 = await R2.c.from('reports').insert({ reporter_id: R2.id, reported_id: T.id, reason: 'spam', status: 'open' });
if (r2.error) fail(`per-user broken: R2 throttled: ${r2.error.message}`);
ok('per-user: R2 is unaffected and can file a report');

// ===========================================================================
console.log('\nGET_DECK — 60/min/user\n');
const U = await makeUser('U', 'man', ['woman']);
const U2 = await makeUser('U2', 'man', ['woman']);
for (let i = 1; i <= 60; i++) {
  const { error } = await U.c.rpc('get_deck', { p_limit: 5, p_offset: 0 });
  if (error) fail(`U deck throttled early at call ${i}: ${error.message}`);
}
ok('first 60 get_deck calls all ok');
const d61 = await U.c.rpc('get_deck', { p_limit: 5, p_offset: 0 });
if (!d61.error) fail('61st get_deck call was NOT throttled');
ok('61st get_deck call → throttled');
const u2deck = await U2.c.rpc('get_deck', { p_limit: 5, p_offset: 0 });
if (u2deck.error) fail(`per-user broken: U2 deck throttled: ${u2deck.error.message}`);
ok('per-user: U2 is unaffected and can browse');

// ===========================================================================
console.log('\nSIGN-PHOTOS — 60/min/user\n');
for (let i = 1; i <= 60; i++) {
  const { error } = await U.c.functions.invoke('sign-photos', { body: { profileIds: [U.id] } });
  if (error) fail(`U sign-photos throttled early at call ${i}: ${error.message}`);
}
ok('first 60 sign-photos calls all ok');
const s61 = await U.c.functions.invoke('sign-photos', { body: { profileIds: [U.id] } });
if (!s61.error) fail('61st sign-photos call was NOT throttled');
ok('61st sign-photos call → throttled (429)');
const u2sign = await U2.c.functions.invoke('sign-photos', { body: { profileIds: [U2.id] } });
if (u2sign.error) fail(`per-user broken: U2 sign-photos throttled: ${u2sign.error.message}`);
ok('per-user: U2 is unaffected and can sign photos');

console.log('\nCleaning up…');
for (const u of cleanup) { try { await u.c.functions.invoke('delete-account', { method: 'POST' }); } catch {} }
ok(`cleaned up ${cleanup.length} accounts`);
console.log('\nRate limiting verified.');
