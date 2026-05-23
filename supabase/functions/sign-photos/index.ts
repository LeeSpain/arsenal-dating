// sign-photos — mint short-lived signed URLs for OTHER users' photos, only when
// the caller is allowed to see them (matched / valid deck candidate / someone the
// caller has blocked, for their own Blocked list). The `photos` bucket is
// owner-only, so this is the only way to view others' photos — which stops bulk
// scraping and bucket list().
//
//   POST { profileIds: string[] }  ->  { photos: { [profileId]: string[] } }
//
// Deploy: supabase functions deploy sign-photos
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MAX_IDS = 50;

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

  const body = await req.json().catch(() => ({}));
  let ids = Array.isArray(body?.profileIds) ? (body.profileIds as string[]) : [];
  ids = Array.from(new Set(ids)).slice(0, MAX_IDS);
  if (ids.length === 0) return json({ photos: {} }, 200);

  // Map caller -> their profile id (the viewer; never taken from the client).
  const { data: me } = await admin
    .from('profiles')
    .select('id')
    .eq('auth_id', userData.user.id)
    .maybeSingle();
  if (!me?.id) return json({ photos: {} }, 200);

  // photos_for_viewer applies the visibility rule and returns only allowed paths.
  const { data: rows, error } = await admin.rpc('photos_for_viewer', {
    p_viewer: me.id,
    p_ids: ids,
  });
  if (error) return json({ error: error.message }, 500);

  const photos: Record<string, string[]> = {};
  for (const r of (rows ?? []) as { profile_id: string; paths: string[] }[]) {
    const signed: string[] = [];
    for (const path of r.paths ?? []) {
      const { data: s } = await admin.storage.from('photos').createSignedUrl(path, 3600);
      if (s?.signedUrl) signed.push(s.signedUrl);
    }
    photos[r.profile_id] = signed;
  }
  return json({ photos }, 200);
});
