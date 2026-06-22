// Live admin-dashboard integration test. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-admin.ts
//
// Covers: server-side is_admin gate on the admin-stats edge function (non-admin
// denied; admin gets the five numeric fields back).
//
// NOTE: uses @arsenaldating.com for throwaway emails because Supabase Auth's
// validator now rejects @arsenaldating.com (the previous verify-stepN convention).
// Sign-up email confirmation is off in dev so nothing is actually sent; the
// accounts are torn down at the end. The same swap will be needed across the
// other verify-step* scripts.
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

// --- User A: a normal (non-admin) signed-in user ---
const { data: sa, error: ea } = await A.auth.signUp({
  email: `admin-a+${Date.now()}@arsenaldating.com`,
  password: pw(),
});
if (ea || !sa.session) fail('A signUp (auto-confirm off?): ' + (ea?.message ?? ''));
const aUid = sa.user!.id;
await A.from('profiles').insert({
  auth_id: aUid,
  dob: '1995-01-01',
  display_name: 'Non-admin',
  gender: 'man',
});
ok('A signed up (non-admin)');

// --- Non-admin is DENIED at the function layer ---
const denyStats = await A.functions.invoke('admin-stats', { method: 'GET' });
if (!denyStats.error) fail('non-admin could call admin-stats!');
ok('non-admin denied by admin-stats (403 surfaced via supabase-js error)');

// --- User B becomes admin (seeded as the postgres role, like the dashboard) ---
const { data: sb_, error: eb } = await B.auth.signUp({
  email: `admin-b+${Date.now()}@arsenaldating.com`,
  password: pw(),
});
if (eb || !sb_.session) fail('B signUp: ' + (eb?.message ?? ''));
const bUid = sb_.user!.id;
await B.from('profiles').insert({
  auth_id: bUid,
  dob: '1990-01-01',
  display_name: 'Admin',
  gender: 'woman',
});
sqlExec(`update public.profiles set is_admin = true where auth_id = '${bUid}'`);
ok('B seeded as admin (via postgres role)');

// --- Admin gets the five numeric fields ---
const statsRes = await B.functions.invoke('admin-stats', { method: 'GET' });
if (statsRes.error) fail('admin-stats failed for admin: ' + statsRes.error.message);
const stats = statsRes.data as Record<string, unknown>;
const required = [
  'pendingKitReviews',
  'openReports',
  'unreadFounderMessages',
  'completedUsers',
  'newUsersToday',
];
for (const k of required) {
  if (typeof stats[k] !== 'number') fail(`stats.${k} not a number (got ${typeof stats[k]})`);
}
ok(`admin received all 5 numeric fields: ${required.map((k) => `${k}=${stats[k]}`).join(', ')}`);

// --- Non-GET method is rejected ---
const wrongMethod = await B.functions.invoke('admin-stats', { method: 'POST' });
if (!wrongMethod.error) fail('admin-stats accepted POST (should be 405)');
ok('admin-stats rejected non-GET method');

// --- Cleanup ---
await A.functions.invoke('delete-account', { method: 'POST' });
await B.functions.invoke('delete-account', { method: 'POST' });
ok('cleaned up both throwaway accounts');

console.log('\nadmin-stats verified end-to-end.');
