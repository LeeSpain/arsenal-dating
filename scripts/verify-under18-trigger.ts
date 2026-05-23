// Proves the DB-level 18+ enforcement: even a direct API insert (bypassing the
// client age gate) cannot store an under-18 profile. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-under18-trigger.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const email = `u18-test+${Date.now()}@example.com`;
const password = 'Az9!' + crypto.randomUUID();

function ok(m: string) {
  console.log('  ✓ ' + m);
}
function fail(m: string): never {
  console.error('  ✗ ' + m);
  process.exit(1);
}

function isoYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

const { data: su, error: suErr } = await sb.auth.signUp({ email, password });
if (suErr) fail('signUp: ' + suErr.message);
if (!su.session) fail('no session (auto-confirm off?)');
ok('signed up');

// A newborn dob (today) — must be rejected by the trigger.
const { error: e0 } = await sb
  .from('profiles')
  .insert({ auth_id: su.user!.id, dob: new Date().toISOString().slice(0, 10) });
if (!e0) fail('DB ACCEPTED an under-18 profile (trigger missing!)');
ok('DB rejected age 0 ("' + e0.message + '")');

// A 17-year-old — must also be rejected.
const { error: e17 } = await sb
  .from('profiles')
  .insert({ auth_id: su.user!.id, dob: isoYearsAgo(17) });
if (!e17) fail('DB accepted a 17-year-old');
ok('DB rejected a 17-year-old');

// An 18-year-old — must be accepted.
const { error: e18 } = await sb
  .from('profiles')
  .insert({ auth_id: su.user!.id, dob: isoYearsAgo(18) });
if (e18) fail('DB rejected a valid 18-year-old: ' + e18.message);
ok('DB accepted a valid 18-year-old');

// Clean up the throwaway account (full erasure).
await sb.functions.invoke('delete-account', { method: 'POST' });
ok('cleaned up throwaway account');

console.log('\nServer-side 18+ trigger verified.');
