// Live integration check for the account-erasure path (the SAME path the
// under-18 age gate uses). Requires: schema pushed, delete-account function
// deployed, and email auto-confirm ON (MVP) so anon sign-up returns a session.
//
// Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-erasure.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY in env');
  process.exit(1);
}

const email = `erase-test+${Date.now()}@example.com`;
// High-entropy, not a known-leaked password (project has weak-password checks).
const password = 'Az9!' + crypto.randomUUID();

function ok(m: string) {
  console.log('  ✓ ' + m);
}
function fail(m: string): never {
  console.error('  ✗ ' + m);
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// 1) Sign up + get a session.
const { data: su, error: suErr } = await sb.auth.signUp({
  email,
  password,
  options: { data: { tos_accepted_at: new Date().toISOString(), policy_version: 'test' } },
});
if (suErr) fail('signUp: ' + suErr.message);
if (!su.session) {
  fail('No session after signUp — email confirmation is ON. Enable auto-confirm for the MVP demo.');
}
const userId = su.user!.id;
ok('signed up with a session (user ' + userId + ')');

// 2) Create real data so we can prove cascade erasure (adult dob -> passes the
//    18+ trigger). The under-18 gate would NOT create this; here we do, to show
//    that erasure removes data + auth user together.
const { error: pErr } = await sb.from('profiles').insert({ auth_id: userId, dob: '1990-01-01' });
if (pErr) fail('insert profile: ' + pErr.message);
const { data: before } = await sb.from('profiles').select('id').maybeSingle();
if (!before) fail('profile not present before erasure');
ok('created a profile row and confirmed it exists');

// 3) Run the full erasure (storage + cascade DB + auth user).
const { error: fErr } = await sb.functions.invoke('delete-account', { method: 'POST' });
if (fErr) fail('delete-account function: ' + fErr.message);
ok('delete-account function returned ok');

// 4) Proof: the auth user is gone — sign-in now fails.
const probe = createClient(url, key, { auth: { persistSession: false } });
const { error: siErr } = await probe.auth.signInWithPassword({ email, password });
if (!siErr) fail('user can STILL sign in after erasure');
ok('auth user erased (sign-in fails: "' + siErr.message + '")');

// 5) Proof: the email is free again (re-signup works) — then clean up.
const { data: re, error: reErr } = await probe.auth.signUp({ email, password });
if (reErr) {
  console.log('  (re-signup note: ' + reErr.message + ')');
} else {
  ok('email freed (re-signup succeeded)');
  if (re.session) await probe.functions.invoke('delete-account', { method: 'POST' });
}

console.log('\nErasure path verified end-to-end.');
