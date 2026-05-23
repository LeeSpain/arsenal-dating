// One-off: seed two matches for the founder to test the chat on web — one where
// she hasn't messaged (founder sees the calm waiting panel), one where she has
// (founder can reply). Cleaned up after.
//   node --experimental-strip-types --env-file=.env scripts/seed-chat.ts
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const dbPw = process.env.SUPABASE_DB_PASSWORD!;
const FOUNDER_ID = 'a696797c-bb72-4db5-9331-7be0bc495381';
const POOLER = 'host=aws-1-eu-central-1.pooler.supabase.com port=5432 user=postgres.gdrplaxjvwrgundmzzvz dbname=postgres';
const LONDON = { name: 'London', lat: 51.5074, lng: -0.1278 };

function sql(q: string): string {
  return execSync(`psql "${POOLER}" -tAc ${JSON.stringify(q)}`, {
    env: { ...process.env, PGPASSWORD: dbPw },
    encoding: 'utf8',
  }).trim();
}

async function makeWoman(name: string, img: string, era: string, players: string[]) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data: su, error } = await c.auth.signUp({ email: `chat-seed-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: 'Az9!' + crypto.randomUUID() });
  if (error || !su.session) { console.error('signup failed:', error?.message); process.exit(1); }
  const uid = su.user!.id;
  await c.from('profiles').insert({ auth_id: uid, dob: '1995-04-10', display_name: name, gender: 'woman', bio: 'COYG.', location: LONDON.name, city_lat: LONDON.lat, city_lng: LONDON.lng, onboarding_completed: true });
  const { data: prof } = await c.from('profiles').select('id').single();
  const id = prof!.id as string;
  await c.from('preferences').upsert({ profile_id: id, min_age: 18, max_age: 99, max_distance_km: 20000, interested_in_gender: ['man'] });
  await c.from('questionnaire').upsert({ profile_id: id, favourite_era: era, favourite_players: players });
  await c.storage.from('photos').upload(`${uid}/photo.png`, readFileSync(img), { contentType: 'image/png', upsert: true });
  await c.from('photos').insert({ profile_id: id, url: `${uid}/photo.png`, is_primary: true });
  return { c, id, name };
}

const w1 = await makeWoman('Gunner Gal', 'assets/images/react-logo.png', 'arteta', ['Saka', 'Ødegaard']);
const w2 = await makeWoman('Highbury Hannah', 'assets/images/expo-logo.png', 'invincibles', ['Henry']);

// Create the two matches directly (postgres role bypasses RLS).
for (const w of [w1, w2]) {
  sql(`insert into public.matches (profile_a, profile_b) values (least('${FOUNDER_ID}'::uuid,'${w.id}'::uuid), greatest('${FOUNDER_ID}'::uuid,'${w.id}'::uuid)) on conflict do nothing`);
}
const m2 = sql(`select id from public.matches where (profile_a=least('${FOUNDER_ID}'::uuid,'${w2.id}'::uuid) and profile_b=greatest('${FOUNDER_ID}'::uuid,'${w2.id}'::uuid))`);

// Highbury Hannah opens her chat (she's the woman -> allowed to send first).
const { error: msgErr } = await w2.c.from('messages').insert({ match_id: m2, sender_id: w2.id, body: 'Hiya! Spotted a fellow Gooner 👀 up the Arsenal!' });
if (msgErr) console.error('seed message failed:', msgErr.message);

console.log(`Seeded matches for the founder:`);
console.log(`  • ${w1.name} — has NOT messaged (you'll see the calm waiting panel)`);
console.log(`  • ${w2.name} — has messaged (you can reply)`);
console.log(`Refresh the app and open the Matches tab.`);
