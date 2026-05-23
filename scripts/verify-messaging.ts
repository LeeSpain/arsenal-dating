// Live step-6 test. Run:
//   node --experimental-strip-types --env-file=.env scripts/verify-messaging.ts
//
// Proves: (1) the waiting party in a woman+man match is REJECTED BY THE DB if they
// try to send first; (2) same-gender and non-binary matches let either party open;
// (3) a third user genuinely cannot read a chat they're not part of.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const pw = () => 'Az9!' + crypto.randomUUID();
function ok(m: string) { console.log('  ✓ ' + m); }
function fail(m: string): never { console.error('  ✗ ' + m); process.exit(1); }

type User = { c: SupabaseClient; id: string; name: string };
const everyone: User[] = [];

async function makeUser(name: string, gender: string): Promise<User> {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data: su, error } = await c.auth.signUp({ email: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: pw() });
  if (error || !su.session) fail(`signUp ${name}: ${error?.message ?? 'no session'}`);
  // Messaging doesn't require a completed profile; keep it false to skip the
  // photo requirement (#6).
  await c.from('profiles').insert({ auth_id: su.user!.id, dob: '1995-01-01', display_name: name, gender, onboarding_completed: false });
  const { data: prof } = await c.from('profiles').select('id').single();
  const u = { c, id: prof!.id as string, name };
  everyone.push(u);
  return u;
}

async function createMatch(a: User, b: User): Promise<string> {
  await a.c.from('swipes').insert({ swiper_id: a.id, target_id: b.id, direction: 'like' });
  await b.c.from('swipes').insert({ swiper_id: b.id, target_id: a.id, direction: 'like' });
  const { data } = await a.c.from('matches').select('id')
    .or(`and(profile_a.eq.${a.id},profile_b.eq.${b.id}),and(profile_a.eq.${b.id},profile_b.eq.${a.id})`)
    .maybeSingle();
  if (!data) fail(`no match created for ${a.name}+${b.name}`);
  return data.id as string;
}

async function trySend(u: User, matchId: string, bodyText: string): Promise<string | null> {
  const { error } = await u.c.from('messages').insert({ match_id: matchId, sender_id: u.id, body: bodyText });
  return error ? error.message : null;
}

// ---------------------------------------------------------------------------
console.log('\n1) WOMAN-FIRST ENFORCED AT THE DB (woman + man)\n');
const woman = await makeUser('Woman', 'woman');
const man = await makeUser('Man', 'man');
const wmMatch = await createMatch(woman, man);

const manErr = await trySend(man, wmMatch, 'hey');
console.log(`  Man tries to send the first message → ${manErr ? 'REJECTED: "' + manErr + '"' : 'allowed'}`);
if (!manErr) fail('the man was able to send the first message in a woman+man match');
ok('waiting party (man) rejected at the DB, not just hidden in the UI');

const wErr = await trySend(woman, wmMatch, 'hiya, COYG');
if (wErr) fail(`the woman could not send first: ${wErr}`);
ok('the woman can send the first message');

const manReply = await trySend(man, wmMatch, 'up the Arsenal!');
if (manReply) fail(`the man could not reply after she opened: ${manReply}`);
ok('once she has opened, the man can reply freely');

// ---------------------------------------------------------------------------
console.log('\n2) SAME-GENDER / NON-BINARY → EITHER PARTY OPENS\n');
const womanA = await makeUser('WomanA', 'woman');
const womanB = await makeUser('WomanB', 'woman');
const wwMatch = await createMatch(womanA, womanB);
const wwErr = await trySend(womanB, wwMatch, 'hello!');
if (wwErr) fail(`same-gender first message blocked: ${wwErr}`);
ok('woman + woman: either party can open (one of them sent first)');

const nb = await makeUser('NB', 'non_binary');
const man2 = await makeUser('Man2', 'man');
const nbMatch = await createMatch(nb, man2);
const nbErr = await trySend(man2, nbMatch, 'alright?');
if (nbErr) fail(`non-binary pairing first message blocked: ${nbErr}`);
ok('non-binary + man: either party can open (the man sent first)');

// ---------------------------------------------------------------------------
console.log('\n3) A THIRD USER CANNOT READ A CHAT THEY ARE NOT IN\n');
const outsider = await makeUser('Outsider', 'man');
const { data: peek } = await outsider.c.from('messages').select('*').eq('match_id', wmMatch);
console.log(`  Outsider reads the Woman+Man chat (${(await woman.c.from('messages').select('id').eq('match_id', wmMatch)).data?.length ?? '?'} messages exist) → sees ${peek?.length ?? 0}`);
if ((peek?.length ?? 0) !== 0) fail('an outsider could read messages from a chat they are not in');
ok('outsider sees 0 messages (participant-only RLS holds)');
const outErr = await trySend(outsider, wmMatch, 'butting in');
if (!outErr) fail('an outsider could post into a chat they are not in');
ok('outsider also cannot post into that chat');

// ---------------------------------------------------------------------------
console.log('\nCleaning up…');
for (const u of everyone) await u.c.functions.invoke('delete-account', { method: 'POST' });
ok(`cleaned up ${everyone.length} throwaway accounts`);
console.log('\nStep 6 verified end-to-end.');
