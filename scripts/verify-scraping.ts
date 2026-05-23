// Live test for hardening #3. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-scraping.ts
//
// Proves a fresh account with no matches CANNOT bulk-enumerate profiles or
// list/sign/download others' photos — each denial shown explicitly — while the
// legitimate paths (your matches, your deck candidates via the checked function)
// still work.
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
  const { data: su, error } = await c.auth.signUp({ email: `scrape-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: pw() });
  if (error || !su.session) fail(`signUp ${name}: ${error?.message ?? 'no session'}`);
  const uid = su.user!.id;
  await c.from('profiles').insert({ auth_id: uid, dob: '1995-01-01', display_name: name, gender, location: LONDON.name, city_lat: LONDON.lat, city_lng: LONDON.lng, onboarding_completed: true });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({ profile_id: id, min_age: 18, max_age: 99, max_distance_km: 20000, interested_in_gender: interested });
  await c.storage.from('photos').upload(`${uid}/x.png`, PNG, { contentType: 'image/png', upsert: true });
  await c.from('photos').insert({ profile_id: id, url: `${uid}/x.png`, is_primary: true });
  const u = { c, id, uid, name };
  cleanup.push(u);
  return u;
}

// Victims + a matched user, and the attacker (a man interested only in women).
const vWoman = await makeUser('Victim Woman', 'woman');
const vMan = await makeUser('Victim Man', 'man');
const vMatch = await makeUser('Matched Woman', 'woman');
const att = await makeUser('Attacker', 'man', ['woman']);
// Attacker matches vMatch (mutual like).
await att.c.from('swipes').insert({ swiper_id: att.id, target_id: vMatch.id, direction: 'like' });
await vMatch.c.from('swipes').insert({ swiper_id: vMatch.id, target_id: att.id, direction: 'like' });

console.log('\nFresh account "Attacker" (no matches except Matched Woman) tries to scrape:\n');

// 1) Bulk profile enumeration via public_profiles
const { data: all } = await att.c.from('public_profiles').select('id, display_name');
const names = (all ?? []).map((r: any) => r.display_name);
console.log(`  public_profiles returns: [${names.join(', ')}]`);
if ((all ?? []).some((r: any) => r.id === vWoman.id || r.id === vMan.id)) fail('attacker enumerated non-matched profiles');
ok('cannot bulk-enumerate — only self + matches appear (not Victim Woman/Man)');

// 2) Direct lookup of a non-matched profile by id
const { data: direct } = await att.c.from('public_profiles').select('id').eq('id', vWoman.id);
if ((direct ?? []).length !== 0) fail('attacker read a non-matched profile directly');
ok('cannot read a non-matched profile directly by id (empty)');

// 3) Bucket list() — cannot enumerate the photos bucket
const rootList = await att.c.storage.from('photos').list('');
const folders = (rootList.data ?? []).map((f: any) => f.name);
if (folders.some((f) => f === vWoman.uid || f === vMan.uid || f === vMatch.uid)) fail('attacker listed others’ photo folders');
ok(`cannot list others' photo folders (saw: [${folders.join(', ') || 'none'}])`);

// 4) Direct sign of another user's photo path (even knowing the path)
const directSign = await att.c.storage.from('photos').createSignedUrl(`${vWoman.uid}/x.png`, 60);
if (!directSign.error && directSign.data?.signedUrl) fail('attacker directly signed another user’s photo');
ok('cannot directly sign another user’s photo (storage owner-only)');

// 5) sign-photos for a NON-candidate, NON-match (a man — outside attacker's prefs)
const signMan = await att.c.functions.invoke('sign-photos', { body: { profileIds: [vMan.id] } });
if ((signMan.data?.photos?.[vMan.id]?.length ?? 0) > 0) fail('attacker signed photos of a non-candidate');
ok('sign-photos denies a non-candidate / non-match (no URLs returned)');

console.log('\nLegitimate paths still work:\n');

// 6) Matched user IS visible + signable
const { data: matchView } = await att.c.from('public_profiles').select('id').eq('id', vMatch.id).maybeSingle();
const signMatch = await att.c.functions.invoke('sign-photos', { body: { profileIds: [vMatch.id] } });
if (!matchView || (signMatch.data?.photos?.[vMatch.id]?.length ?? 0) === 0) fail('matched user not viewable/signable');
ok('matched user is visible in public_profiles and their photo signs');

// 7) Deck still works + a deck candidate's photo signs via the checked function
const deck = await att.c.rpc('get_deck', { p_limit: 50, p_offset: 0 });
const hasWoman = (deck.data ?? []).some((r: any) => r.id === vWoman.id);
const signWoman = await att.c.functions.invoke('sign-photos', { body: { profileIds: [vWoman.id] } });
if (!hasWoman) fail('deck did not return an eligible candidate');
if ((signWoman.data?.photos?.[vWoman.id]?.length ?? 0) === 0) fail('deck candidate photo did not sign');
ok('deck returns eligible candidates and their photos sign (the legitimate browse path)');

console.log('\nCleaning up…');
for (const u of cleanup) { try { await u.c.functions.invoke('delete-account', { method: 'POST' }); } catch {} }
ok(`cleaned up ${cleanup.length} accounts`);
console.log('\nScraping lockdown verified.');
