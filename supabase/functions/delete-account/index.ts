// delete-account — full account erasure (GDPR right to erasure + under-18 gate).
//
// Removes the caller's Storage objects, then deletes the auth user, which
// cascades every DB row (profiles -> photos/questionnaire/preferences/swipes/
// matches/messages/reports/blocks) via on-delete-cascade FKs.
//
// Runs with the SERVICE ROLE key, which Supabase injects into deployed functions
// as SUPABASE_SERVICE_ROLE_KEY. The key is NEVER shipped in the app or .env.
//
// Deploy:  supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Buckets that may hold user files (created in the photo build step). Missing
// buckets are ignored so erasure is safe even before they exist.
const USER_BUCKETS = ['photos', 'kit-photos'];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing authorization' }, 401);
  const jwt = authHeader.replace('Bearer ', '').trim();

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Identify the caller from their JWT — they can only erase themselves.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json({ error: 'invalid session' }, 401);
  }
  const userId = userData.user.id;

  // 1) Storage: delete everything under the user's folder in each bucket.
  for (const bucket of USER_BUCKETS) {
    try {
      const { data: files } = await admin.storage
        .from(bucket)
        .list(userId, { limit: 1000 });
      if (files && files.length > 0) {
        await admin.storage
          .from(bucket)
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch (_e) {
      // bucket doesn't exist yet — nothing to remove
    }
  }

  // 2) Delete the auth user -> cascades all DB rows via FKs.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true }, 200);
});
