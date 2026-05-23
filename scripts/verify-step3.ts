// Live step-3 integration test. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-step3.ts
//
// Covers: photo upload + signed URL; the privileged-column guard (a user cannot
// self-grant is_admin / kit_verified); kit review with SERVER-SIDE is_admin
// enforcement (non-admin denied, admin approves -> badge); onboarding visibility.
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dbPw = process.env.SUPABASE_DB_PASSWORD;
if (!url || !key || !dbPw) {
  console.error('Missing env (need EXPO_PUBLIC_* and SUPABASE_DB_PASSWORD)');
  process.exit(1);
}

const POOLER =
  'host=aws-1-eu-central-1.pooler.supabase.com port=5432 user=postgres.gdrplaxjvwrgundmzzvz dbname=postgres';
// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const pw = () => 'Az9!' + crypto.randomUUID();
function ok(m: string) {
  console.log('  ✓ ' + m);
}
function fail(m: string): never {
  console.error('  ✗ ' + m);
  process.exit(1);
}
function sqlExec(sql: string) {
  execSync(`psql "${POOLER}" -tAc ${JSON.stringify(sql)}`, {
    env: { ...process.env, PGPASSWORD: dbPw },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

const A = createClient(url, key, { auth: { persistSession: false } });
const B = createClient(url, key, { auth: { persistSession: false } });

// --- User A: profile + photo ---
const { data: sa, error: ea } = await A.auth.signUp({ email: `s3-a+${Date.now()}@example.com`, password: pw() });
if (ea || !sa.session) fail('A signUp (auto-confirm off?): ' + (ea?.message ?? ''));
const aUid = sa.user!.id;
await A.from('profiles').insert({ auth_id: aUid, dob: '1995-01-01', display_name: 'Photo Tester', gender: 'man' });
const { data: aProf } = await A.from('profiles').select('id').single();
const aId = aProf!.id as string;
ok('A signed up + profile created');

const photoPath = `${aUid}/test.png`;
const up = await A.storage.from('photos').upload(photoPath, PNG, { contentType: 'image/png', upsert: true });
if (up.error) fail('photo upload: ' + up.error.message);
await A.from('photos').insert({ profile_id: aId, url: photoPath, is_primary: true });
const { data: signed } = await A.storage.from('photos').createSignedUrl(photoPath, 600);
if (!signed?.signedUrl) fail('no signed URL for photo');
const res = await fetch(signed.signedUrl);
if (res.status !== 200) fail('signed URL not fetchable, status ' + res.status);
ok('photo uploaded to private bucket + signed URL fetched (200)');

// --- Privileged-column guard: A cannot self-promote ---
await A.from('profiles').update({ is_admin: true, kit_verified: true }).eq('id', aId);
const { data: aAfter } = await A.from('profiles').select('is_admin, kit_verified').single();
if (aAfter!.is_admin || aAfter!.kit_verified) fail('user self-granted is_admin/kit_verified!');
ok('guard held: user could NOT self-grant is_admin or kit_verified');

// --- A submits a kit photo (pending) ---
await A.storage.from('kit-photos').upload(`${aUid}/kit.jpg`, PNG, { contentType: 'image/jpeg', upsert: true });
await A.from('profiles').update({ kit_photo_url: `${aUid}/kit.jpg`, kit_review_status: 'pending' }).eq('id', aId);
// Make A visible in the deck (simulate completing onboarding).
await A.from('profiles').update({ onboarding_completed: true, onboarding_step: 'completed' }).eq('id', aId);
ok('A submitted kit (pending) and completed onboarding');

// --- Non-admin is DENIED at the function layer ---
const denyList = await A.functions.invoke('kit-review', { method: 'GET' });
if (!denyList.error) fail('non-admin could LIST the kit queue!');
const denyDecide = await A.functions.invoke('kit-review', { method: 'POST', body: { profileId: aId, decision: 'approved' } });
if (!denyDecide.error) fail('non-admin could DECIDE a kit review!');
ok('non-admin denied by kit-review function (list + decide)');

// --- User B becomes admin (seeded as the postgres role, like the dashboard) ---
const { data: sb_, error: eb } = await B.auth.signUp({ email: `s3-b+${Date.now()}@example.com`, password: pw() });
if (eb || !sb_.session) fail('B signUp: ' + (eb?.message ?? ''));
const bUid = sb_.user!.id;
await B.from('profiles').insert({ auth_id: bUid, dob: '1990-01-01', display_name: 'Admin', gender: 'woman' });
sqlExec(`update public.profiles set is_admin = true where auth_id = '${bUid}'`);
ok('B seeded as admin (via postgres role)');

// --- Admin can list + approve ---
const list = await B.functions.invoke('kit-review', { method: 'GET' });
if (list.error) fail('admin list failed: ' + list.error.message);
const items = (list.data?.items ?? []) as { profileId: string; kitPhotoUrl: string | null }[];
const target = items.find((i) => i.profileId === aId);
if (!target) fail('admin did not see A in the pending queue');
if (!target.kitPhotoUrl) fail('admin queue item had no signed kit photo URL');
ok(`admin listed the queue and saw A (with a signed kit URL)`);

const decide = await B.functions.invoke('kit-review', { method: 'POST', body: { profileId: aId, decision: 'approved' } });
if (decide.error) fail('admin approve failed: ' + decide.error.message);

const { data: aVerified } = await A.from('profiles').select('kit_verified, kit_review_status').single();
if (!aVerified!.kit_verified || aVerified!.kit_review_status !== 'approved') fail('approval did not set kit_verified');
ok('admin approved -> A.kit_verified = true (badge granted)');

// --- Badge + photo visible to others via public_profiles ---
const { data: pub } = await B.from('public_profiles').select('kit_verified, photo_urls').eq('id', aId).single();
if (!pub?.kit_verified) fail('badge not visible in public_profiles');
if (!Array.isArray(pub.photo_urls) || !pub.photo_urls.includes(photoPath)) fail('photo not in public_profiles');
ok('public_profiles shows the verified badge + photo for A');

// --- Cleanup ---
await A.functions.invoke('delete-account', { method: 'POST' });
await B.functions.invoke('delete-account', { method: 'POST' });
ok('cleaned up both throwaway accounts');

console.log('\nStep 3 verified end-to-end.');
