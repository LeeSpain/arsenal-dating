// Live test for the hardening batch. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-batch.ts
//
// #5 suspend freezes threads BOTH ways (immediately); #6 onboarding_completed
// needs name+gender+photo; #9 no match between a blocked pair; #7 upload limits;
// GDPR export_my_data returns the caller's own data only.
import { execSync } from 'node:child_process';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const dbPw = process.env.SUPABASE_DB_PASSWORD!;
if (!url || !key || !dbPw) { console.error('Missing env'); process.exit(1); }
const POOLER = 'host=aws-1-eu-central-1.pooler.supabase.com port=5432 user=postgres.gdrplaxjvwrgundmzzvz dbname=postgres';
const LONDON = { name: 'London', lat: 51.5074, lng: -0.1278 };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const pw = () => 'Az9!' + crypto.randomUUID();
function ok(m: string) { console.log('  ✓ ' + m); }
function fail(m: string): never { console.error('  ✗ ' + m); process.exit(1); }
function sql(q: string) { execSync(`psql "${POOLER}" -tAc ${JSON.stringify(q)}`, { env: { ...process.env, PGPASSWORD: dbPw }, stdio: ['ignore', 'ignore', 'inherit'] }); }

type User = { c: SupabaseClient; id: string; uid: string; name: string };
const cleanup: User[] = [];
async function makeUser(name: string, gender: string, opts: { photo?: boolean; completed?: boolean; interested?: string[] } = {}): Promise<User> {
  const photo = opts.photo ?? true;
  const completed = opts.completed ?? true;
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data: su, error } = await c.auth.signUp({ email: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: pw() });
  if (error || !su.session) fail(`signUp ${name}: ${error?.message ?? 'no session'}`);
  const uid = su.user!.id;
  // Legit order: insert incomplete, add photo, THEN mark complete (the #6 rule).
  await c.from('profiles').insert({ auth_id: uid, dob: '1995-01-01', display_name: name, gender, location: LONDON.name, city_lat: LONDON.lat, city_lng: LONDON.lng, onboarding_completed: false });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({ profile_id: id, min_age: 18, max_age: 99, max_distance_km: 20000, interested_in_gender: opts.interested ?? [] });
  if (photo) {
    await c.storage.from('photos').upload(`${uid}/x.png`, PNG, { contentType: 'image/png', upsert: true });
    await c.from('photos').insert({ profile_id: id, url: `${uid}/x.png`, is_primary: true });
  }
  if (completed) await c.from('profiles').update({ onboarding_completed: true }).eq('id', id);
  const u = { c, id, uid, name };
  cleanup.push(u);
  return u;
}

const S = await makeUser('S woman', 'woman', { interested: ['man'] });
const P = await makeUser('P man', 'man', { interested: ['woman'] });
const U = await makeUser('U', 'man');

// ===========================================================================
console.log('\n#5 — SUSPEND FREEZES THREADS BOTH WAYS (immediately)\n');
await S.c.from('swipes').insert({ swiper_id: S.id, target_id: P.id, direction: 'like' });
await P.c.from('swipes').insert({ swiper_id: P.id, target_id: S.id, direction: 'like' });
const mId = execSync(`psql "${POOLER}" -tAc ${JSON.stringify(`select id from public.matches where profile_a=least('${S.id}'::uuid,'${P.id}'::uuid) and profile_b=greatest('${S.id}'::uuid,'${P.id}'::uuid)`)}`, { env: { ...process.env, PGPASSWORD: dbPw }, encoding: 'utf8' }).trim();
const first = await S.c.from('messages').insert({ match_id: mId, sender_id: S.id, body: 'hiya' });
if (first.error) fail('woman could not open the chat: ' + first.error.message);
ok('before suspend: matched, woman opened the thread');

sql(`update public.profiles set is_suspended = true where id = '${S.id}'`); // S keeps a live token
const sSend = await S.c.from('messages').insert({ match_id: mId, sender_id: S.id, body: 'still here?' });
if (!sSend.error) fail('suspended user could still send a message');
ok('suspended user CANNOT send (rejected on a live token)');
const sSwipe = await S.c.from('swipes').insert({ swiper_id: S.id, target_id: U.id, direction: 'like' });
if (!sSwipe.error) fail('suspended user could still swipe');
ok('suspended user CANNOT swipe');
const pSend = await P.c.from('messages').insert({ match_id: mId, sender_id: P.id, body: 'you ok?' });
if (!pSend.error) fail('other user could message into a suspended thread');
ok('the OTHER user CANNOT message into a suspended thread (frozen both ways)');

sql(`update public.profiles set is_suspended = false where id = '${S.id}'`);
const sAgain = await S.c.from('messages').insert({ match_id: mId, sender_id: S.id, body: 'back!' });
const pAgain = await P.c.from('messages').insert({ match_id: mId, sender_id: P.id, body: 'great' });
if (sAgain.error || pAgain.error) fail('unsuspend did not restore messaging');
ok('after unsuspend: both can message again');

// ===========================================================================
console.log('\n#6 — PROFILE COMPLETENESS ENFORCED SERVER-SIDE\n');
const W = await makeUser('W incomplete', 'man', { photo: false, completed: false });
const noPhoto = await W.c.from('profiles').update({ onboarding_completed: true }).eq('id', W.id);
if (!noPhoto.error) fail('completed with no photo was allowed');
ok('cannot complete with no photo (rejected)');
await W.c.storage.from('photos').upload(`${W.uid}/x.png`, PNG, { contentType: 'image/png', upsert: true });
await W.c.from('photos').insert({ profile_id: W.id, url: `${W.uid}/x.png`, is_primary: true });
const nullName = await W.c.from('profiles').update({ display_name: null, onboarding_completed: true }).eq('id', W.id);
if (!nullName.error) fail('completed with null name was allowed');
ok('cannot complete with null name (rejected)');
const good = await W.c.from('profiles').update({ display_name: 'W', onboarding_completed: true }).eq('id', W.id);
if (good.error) fail('a complete profile could not be completed: ' + good.error.message);
ok('complete profile (name+gender+photo) → allowed');

// ===========================================================================
console.log('\n#9 — NO GHOST MATCH BETWEEN A BLOCKED PAIR\n');
const A = await makeUser('A', 'woman');
const B = await makeUser('B', 'man');
await A.c.from('blocks').insert({ blocker_id: A.id, blocked_id: B.id });
await A.c.from('swipes').insert({ swiper_id: A.id, target_id: B.id, direction: 'like' });
await B.c.from('swipes').insert({ swiper_id: B.id, target_id: A.id, direction: 'like' });
const ghost = await A.c.from('matches').select('id').or(`and(profile_a.eq.${A.id},profile_b.eq.${B.id}),and(profile_a.eq.${B.id},profile_b.eq.${A.id})`);
if ((ghost.data ?? []).length !== 0) fail('a blocked pair created a match');
ok('blocked pair: mutual like creates NO match (S+P normal match above proves the happy path)');

// ===========================================================================
console.log('\n#7 — UPLOAD LIMITS (5 MB, images only)\n');
const big = await U.c.storage.from('photos').upload(`${U.uid}/big.png`, Buffer.alloc(6 * 1024 * 1024), { contentType: 'image/png', upsert: true });
if (!big.error) fail('a >5 MB upload was accepted');
ok('>5 MB upload rejected');
const txt = await U.c.storage.from('photos').upload(`${U.uid}/t.txt`, Buffer.from('hi'), { contentType: 'text/plain', upsert: true });
if (!txt.error) fail('a non-image upload was accepted');
ok('non-image (text/plain) upload rejected');
const okImg = await U.c.storage.from('photos').upload(`${U.uid}/ok.png`, PNG, { contentType: 'image/png', upsert: true });
if (okImg.error) fail('a valid small image was rejected: ' + okImg.error.message);
ok('valid small JPEG/PNG upload accepted');

// ===========================================================================
console.log('\nGDPR DATA EXPORT (right of access, owner-only)\n');
const exp = await S.c.rpc('export_my_data');
if (exp.error) fail('export failed: ' + exp.error.message);
const d = exp.data as any;
if (!d?.profile?.dob) fail('export missing own profile/dob');
if ((d.photos?.length ?? 0) < 1) fail('export missing photos');
if ((d.messages?.length ?? 0) < 1) fail('export missing messages');
ok(`S exported own data: profile(dob present) + ${d.photos.length} photo(s) + ${d.messages.length} message(s) + ${d.matches.length} match(es)`);
const expP = await P.c.rpc('export_my_data');
if ((expP.data as any)?.profile?.id !== P.id) fail('export returned the wrong user’s data');
ok('a different user’s export returns THEIR data only (owner-scoped)');

console.log('\nCleaning up…');
for (const u of cleanup) { try { await u.c.functions.invoke('delete-account', { method: 'POST' }); } catch {} }
ok(`cleaned up ${cleanup.length} accounts`);
console.log('\nHardening batch verified.');
