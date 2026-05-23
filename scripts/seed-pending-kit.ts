// One-off: seed a single PENDING kit so the founder can test the review queue.
// Cleaned up after testing. Run:
//   node --experimental-strip-types --env-file=.env scripts/seed-pending-kit.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const c = createClient(url, key, { auth: { persistSession: false } });
const email = `pending-kit-demo+${Date.now()}@example.com`;
const { data: su, error } = await c.auth.signUp({ email, password: 'Az9!' + crypto.randomUUID() });
if (error || !su.session) {
  console.error('signup failed (auto-confirm off?):', error?.message);
  process.exit(1);
}
const uid = su.user!.id;
await c.from('profiles').insert({
  auth_id: uid,
  dob: '1994-06-01',
  display_name: 'Pending Test — safe to approve or reject',
  gender: 'man',
});
const { data: prof } = await c.from('profiles').select('id').single();
await c.storage.from('kit-photos').upload(`${uid}/kit.jpg`, PNG, { contentType: 'image/jpeg', upsert: true });
await c.from('profiles').update({ kit_photo_url: `${uid}/kit.jpg`, kit_review_status: 'pending' }).eq('id', prof!.id);

console.log('Seeded pending kit. email:', email);
