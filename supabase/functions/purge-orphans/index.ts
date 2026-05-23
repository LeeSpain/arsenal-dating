// purge-orphans — founder-only cleanup of storage objects whose owner account no
// longer exists (e.g. out-of-band deletions). Normal account deletion already
// removes storage, so this is a backstop. is_admin enforced server-side.
//
//   POST -> { purged: number }
//
// Deploy: supabase functions deploy purge-orphans
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const USER_BUCKETS = ['photos', 'kit-photos'];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization' }, 401);
  const jwt = authHeader.replace('Bearer ', '').trim();

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'invalid session' }, 401);
  const { data: me } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('auth_id', userData.user.id)
    .maybeSingle();
  if (!me?.is_admin) return json({ error: 'forbidden' }, 403);

  // Folder name = owner auth uid. Keep folders whose auth user still exists.
  const { data: profs } = await admin.from('profiles').select('auth_id');
  const liveUids = new Set((profs ?? []).map((p) => p.auth_id as string));

  let purged = 0;
  for (const bucket of USER_BUCKETS) {
    const { data: folders } = await admin.storage.from(bucket).list('', { limit: 1000 });
    for (const folder of folders ?? []) {
      const uid = folder.name;
      if (!uid || liveUids.has(uid)) continue; // owner still exists -> keep
      const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${uid}/${f.name}`);
      if (paths.length) {
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (!error) purged += paths.length;
      }
    }
  }

  return json({ purged }, 200);
});
