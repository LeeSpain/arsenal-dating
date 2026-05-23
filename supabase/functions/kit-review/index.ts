// kit-review — founder-only kit-photo moderation.
//
// SECURITY: is_admin is enforced HERE, server-side (service-role lookup of the
// caller's profile), not by hiding the screen. A non-admin calling this gets 403,
// and the kit-photos bucket stays owner-only at the DB layer, so non-admins can't
// read others' kit photos directly either.
//
//   GET   -> list profiles with kit_review_status='pending' (+ signed photo URLs)
//   POST  -> { profileId, decision: 'approved' | 'rejected' }  decide
//
// Q4 pass criterion (applied by the human reviewer): the photo clearly shows the
// person wearing a recognisable Arsenal shirt.
//
// Deploy: supabase functions deploy kit-review
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization' }, 401);
  const jwt = authHeader.replace('Bearer ', '').trim();

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Who is calling?
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'invalid session' }, 401);

  // SERVER-SIDE admin check — the real gate.
  const { data: me } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('auth_id', userData.user.id)
    .maybeSingle();
  if (!me?.is_admin) return json({ error: 'forbidden' }, 403);

  if (req.method === 'GET') {
    const { data: pending, error } = await admin
      .from('profiles')
      .select('id, display_name, kit_photo_url, created_at')
      .eq('kit_review_status', 'pending')
      .order('created_at', { ascending: true });
    if (error) return json({ error: error.message }, 500);

    const items = [];
    for (const p of pending ?? []) {
      let kitPhotoUrl: string | null = null;
      if (p.kit_photo_url) {
        const { data: s } = await admin.storage
          .from('kit-photos')
          .createSignedUrl(p.kit_photo_url as string, 3600);
        kitPhotoUrl = s?.signedUrl ?? null;
      }
      items.push({ profileId: p.id, displayName: p.display_name, kitPhotoUrl });
    }
    return json({ items }, 200);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { profileId, decision } = body as { profileId?: string; decision?: string };
    if (!profileId || (decision !== 'approved' && decision !== 'rejected')) {
      return json({ error: 'bad request' }, 400);
    }
    const update =
      decision === 'approved'
        ? { kit_review_status: 'approved', kit_verified: true }
        : { kit_review_status: 'rejected', kit_verified: false };
    const { error } = await admin.from('profiles').update(update).eq('id', profileId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true }, 200);
  }

  return json({ error: 'method not allowed' }, 405);
});
