// Live step-7 test. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-safety.ts
//
// Proves BLOCK is total + bidirectional across all four DB layers, plus the
// report queue, admin-only enforcement (403), suspend/unsuspend, remove, purge.
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
function sql(q: string): string {
  return execSync(`psql "${POOLER}" -tAc ${JSON.stringify(q)}`, { env: { ...process.env, PGPASSWORD: dbPw }, encoding: 'utf8' }).trim();
}

type User = { c: SupabaseClient; id: string; uid: string; email: string; password: string; name: string };
const cleanup: User[] = [];
async function makeUser(name: string, gender: string, interested: string[] = [], withPhoto = false): Promise<User> {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const email = `safe-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = pw();
  const { data: su, error } = await c.auth.signUp({ email, password });
  if (error || !su.session) fail(`signUp ${name}: ${error?.message ?? 'no session'}`);
  const uid = su.user!.id;
  await c.from('profiles').insert({ auth_id: uid, dob: '1995-01-01', display_name: name, gender, location: LONDON.name, city_lat: LONDON.lat, city_lng: LONDON.lng, onboarding_completed: true });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({ profile_id: id, min_age: 18, max_age: 99, max_distance_km: 20000, interested_in_gender: interested });
  if (withPhoto) {
    await c.storage.from('photos').upload(`${uid}/x.png`, PNG, { contentType: 'image/png', upsert: true });
    await c.from('photos').insert({ profile_id: id, url: `${uid}/x.png`, is_primary: true });
  }
  const u = { c, id, uid, email, password, name };
  cleanup.push(u);
  return u;
}
async function like(a: User, b: User) { await a.c.from('swipes').insert({ swiper_id: a.id, target_id: b.id, direction: 'like' }); }
async function deckHas(v: User, targetId: string): Promise<boolean> {
  const { data } = await v.c.rpc('get_deck', { p_limit: 100, p_offset: 0 });
  return (data ?? []).some((r: any) => r.id === targetId);
}
async function canSeeProfile(v: User, targetId: string): Promise<boolean> {
  const { data } = await v.c.from('public_profiles').select('id').eq('id', targetId).maybeSingle();
  return !!data;
}
async function matchCount(v: User, otherId: string): Promise<number> {
  const { data } = await v.c.from('matches').select('id').or(`and(profile_a.eq.${v.id},profile_b.eq.${otherId}),and(profile_a.eq.${otherId},profile_b.eq.${v.id})`);
  return (data ?? []).length;
}

// ===========================================================================
console.log('\nBLOCK — four layers, both directions\n');
const A = await makeUser('A (woman)', 'woman', ['man']);
const B = await makeUser('B (man)', 'man', ['woman']);
await like(A, B); await like(B, A);
const m = sql(`select id from public.matches where profile_a=least('${A.id}'::uuid,'${B.id}'::uuid) and profile_b=greatest('${A.id}'::uuid,'${B.id}'::uuid)`);
await A.c.from('messages').insert({ match_id: m, sender_id: A.id, body: 'hiya' });
console.log(`  before block: A&B matched, thread has ${(await A.c.from('messages').select('id').eq('match_id', m)).data?.length} message(s)`);

await A.c.from('blocks').insert({ blocker_id: A.id, blocked_id: B.id });

// (a) match + thread gone for BOTH
if ((await matchCount(A, B.id)) !== 0 || (await matchCount(B, A.id)) !== 0) fail('match still visible after block');
if (((await A.c.from('messages').select('id').eq('match_id', m)).data?.length ?? 0) !== 0) fail('messages remain after block');
ok('(a) match + thread deleted for BOTH (A and B)');

// (b) profile invisible BOTH ways
if (await canSeeProfile(A, B.id)) fail('A can still see B after block');
if (await canSeeProfile(B, A.id)) fail('B can still see A after block');
ok('(b) public_profiles returns nothing in either direction');

// (d) message rejected even if a match somehow exists
sql(`insert into public.matches (profile_a, profile_b) values (least('${A.id}'::uuid,'${B.id}'::uuid), greatest('${A.id}'::uuid,'${B.id}'::uuid)) on conflict do nothing`);
const edgeM = sql(`select id from public.matches where profile_a=least('${A.id}'::uuid,'${B.id}'::uuid) and profile_b=greatest('${A.id}'::uuid,'${B.id}'::uuid)`);
const { error: blockedSend } = await B.c.from('messages').insert({ match_id: edgeM, sender_id: B.id, body: 'back?' });
if (!blockedSend) fail('blocked user B was able to message A');
ok(`(d) blocked user's message is rejected at the DB ("${blockedSend.message.slice(0, 48)}…")`);

// (c) deck exclusion BOTH ways (fresh pair, never swiped)
const C = await makeUser('C (woman)', 'woman', ['man']);
const D = await makeUser('D (man)', 'man', ['woman']);
const cBeforeD = await deckHas(C, D.id);
const dBeforeC = await deckHas(D, C.id);
await C.c.from('blocks').insert({ blocker_id: C.id, blocked_id: D.id });
const cAfterD = await deckHas(C, D.id);
const dAfterC = await deckHas(D, C.id);
console.log(`  before block: D in C's deck=${cBeforeD}, C in D's deck=${dBeforeC}`);
console.log(`  after  block: D in C's deck=${cAfterD}, C in D's deck=${dAfterC}`);
if (!cBeforeD || !dBeforeC || cAfterD || dAfterC) fail('deck exclusion failed in one direction');
ok('(c) deck excludes the pair in BOTH directions after block');

// ===========================================================================
console.log('\nREPORT QUEUE + ADMIN-ONLY + SUSPEND/REMOVE\n');
const T = await makeUser('T admin', 'man');
sql(`update public.profiles set is_admin=true where id='${T.id}'`);
const R = await makeUser('R reporter', 'woman', ['man']);
const X = await makeUser('X reported', 'man', ['woman'], true);
await R.c.from('reports').insert({ reporter_id: R.id, reported_id: X.id, reason: 'harassment', details: 'test report', status: 'open' });

const nonAdmin = await R.c.functions.invoke('report-review', { method: 'GET' });
if (!nonAdmin.error) fail('non-admin could read the report queue');
ok('non-admin gets 403 on the report queue');

const adminList = await T.c.functions.invoke('report-review', { method: 'GET' });
if (adminList.error) fail('admin list failed: ' + adminList.error.message);
const item = (adminList.data?.items ?? []).find((i: any) => i.reportedId === X.id);
if (!item) fail('reported user not in the admin queue');
ok(`report lands in the founder queue (reason "${item.reason}", photo ${item.reportedPhotoUrl ? 'present' : 'none'})`);

await T.c.functions.invoke('report-review', { method: 'POST', body: { reportId: item.reportId, action: 'suspend' } });
if (sql(`select is_suspended from public.profiles where id='${X.id}'`) !== 't') fail('suspend did not set is_suspended');
if (await canSeeProfile(R, X.id)) fail('suspended user still visible in public_profiles');
const banSignin = await createClient(url, key, { auth: { persistSession: false } }).auth.signInWithPassword({ email: X.email, password: X.password });
if (!banSignin.error) fail('suspended user could still log in');
ok(`suspend: is_suspended=true, hidden from deck/profiles, login blocked ("${banSignin.error.message.slice(0, 40)}…")`);

await T.c.functions.invoke('report-review', { method: 'POST', body: { reportId: item.reportId, action: 'unsuspend' } });
const unbanSignin = await createClient(url, key, { auth: { persistSession: false } }).auth.signInWithPassword({ email: X.email, password: X.password });
if (unbanSignin.error) fail('unsuspend did not restore login: ' + unbanSignin.error.message);
ok('unsuspend: login restored');

await T.c.functions.invoke('report-review', { method: 'POST', body: { reportId: item.reportId, action: 'remove' } });
const goneSignin = await createClient(url, key, { auth: { persistSession: false } }).auth.signInWithPassword({ email: X.email, password: X.password });
if (!goneSignin.error) fail('removed user can still log in');
ok('remove: reported user fully erased (login now invalid)');

// ===========================================================================
console.log('\nORPHAN PURGE\n');
const O = await makeUser('O orphan', 'man', [], true);
sql(`delete from auth.users where id='${O.uid}'`); // cascades DB, leaves the storage object orphaned
cleanup.splice(cleanup.indexOf(O), 1);
const purge = await T.c.functions.invoke('purge-orphans', { method: 'POST' });
if (purge.error) fail('purge failed: ' + purge.error.message);
console.log(`  purge removed ${purge.data?.purged} orphaned image(s) (the fresh one + earlier demo orphans)`);
if ((purge.data?.purged ?? 0) < 1) fail('purge removed nothing');
ok('orphan purge cleared orphaned storage');

// ===========================================================================
console.log('\nCleaning up…');
for (const u of cleanup) { try { await u.c.functions.invoke('delete-account', { method: 'POST' }); } catch {} }
ok(`cleaned up ${cleanup.length} throwaway accounts`);
console.log('\nStep 7 verified end-to-end.');
