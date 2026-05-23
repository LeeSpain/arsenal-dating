// Proves the Q3 privacy model live: another user sees only the public_profiles
// view (age as an integer, never dob) and cannot read the owner-only base table.
//   node --experimental-strip-types --env-file=.env scripts/verify-privacy.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}

function ok(m: string) {
  console.log('  ✓ ' + m);
}
function fail(m: string): never {
  console.error('  ✗ ' + m);
  process.exit(1);
}
const pw = () => 'Az9!' + crypto.randomUUID();
const isoYearsAgo = (y: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  return d.toISOString().slice(0, 10);
};

// --- User A: a complete, visible profile ---
const a = createClient(url, key, { auth: { persistSession: false } });
const { data: sa, error: ea } = await a.auth.signUp({
  email: `q3-a+${Date.now()}@example.com`,
  password: pw(),
});
if (ea || !sa.session) fail('A signUp failed (auto-confirm off?): ' + (ea?.message ?? ''));

const { error: pErr } = await a.from('profiles').insert({
  auth_id: sa.user!.id,
  dob: isoYearsAgo(30),
  display_name: 'Gooner A',
  location: 'London',
  gender: 'woman',
  onboarding_completed: true,
});
if (pErr) fail('A profile insert: ' + pErr.message);
const { data: aProfile } = await a.from('profiles').select('id').single();
const aId = aProfile!.id as string;
await a.from('questionnaire').insert({ profile_id: aId, favourite_era: 'Invincibles' });
ok('User A created a complete, onboarding-completed profile (dob = 30y ago)');

// --- User B: a different signed-in user browsing ---
const b = createClient(url, key, { auth: { persistSession: false } });
const { data: sb_, error: eb } = await b.auth.signUp({
  email: `q3-b+${Date.now()}@example.com`,
  password: pw(),
});
if (eb || !sb_.session) fail('B signUp failed: ' + (eb?.message ?? ''));

// B sees A through the view, with age as an integer.
const { data: viewRow, error: vErr } = await b
  .from('public_profiles')
  .select('id, age, display_name, favourite_era')
  .eq('id', aId)
  .single();
if (vErr) fail('B reading public_profiles: ' + vErr.message);
if (!viewRow) fail('B could not see A in public_profiles');
if (typeof viewRow.age !== 'number') fail('age is not an integer in the view');
ok(`B sees A via public_profiles: age=${viewRow.age} (integer), no dob field present`);

// B must NOT be able to read dob through the view (column does not exist).
const { error: dobErr } = await b.from('public_profiles').select('id, dob').eq('id', aId);
if (!dobErr) fail('public_profiles exposed a dob column!');
ok('public_profiles has no dob column ("' + dobErr.message + '")');

// B must NOT be able to read A's base profile row (owner-only RLS).
const { data: baseRows, error: baseErr } = await b
  .from('profiles')
  .select('id, dob')
  .eq('id', aId);
if (baseErr) ok('base profiles read blocked ("' + baseErr.message + '")');
else if (!baseRows || baseRows.length === 0) ok('base profiles row not visible to B (owner-only RLS)');
else fail('B could read A’s base profile row!');

// Cleanup both throwaway accounts.
await a.functions.invoke('delete-account', { method: 'POST' });
await b.functions.invoke('delete-account', { method: 'POST' });
ok('cleaned up both throwaway accounts');

console.log('\nQ3 privacy model verified: others see age, never DOB.');
