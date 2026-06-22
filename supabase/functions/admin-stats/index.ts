// admin-stats — founder-only dashboard counts.
//
// SECURITY: is_admin is enforced HERE, server-side (service-role lookup of the
// caller's profile), not by hiding the screen. A non-admin calling this gets
// 403. The screen's isAdmin check is cosmetic only.
//
//   GET   -> {
//     pendingKitReviews:     int,
//     openReports:           int,
//     unreadFounderMessages: int,
//     completedUsers:        int,
//     newUsersToday:         int,
//   }
//
// All counts use head+exact so no rows transfer — the function returns numbers
// only, no PII, no row contents.
//
// Deploy: supabase functions deploy admin-stats
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  // UTC start-of-day so "today" matches what an operator would expect on the
  // server clock, and rolls over cleanly at 00:00 UTC.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  // Five count queries in parallel. head+exact returns the count without
  // shipping any rows.
  const [pendingKit, openReports, unreadMessages, completed, newToday] = await Promise.all([
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('kit_review_status', 'pending'),
    admin
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'reviewing']),
    admin
      .from('founder_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_step', 'completed'),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_step', 'completed')
      .gte('created_at', todayStartIso),
  ]);

  // If any subquery errored, surface a generic 500 — the operator can read the
  // function logs for detail. We don't leak DB error messages.
  if (
    pendingKit.error ||
    openReports.error ||
    unreadMessages.error ||
    completed.error ||
    newToday.error
  ) {
    return json({ error: 'count query failed' }, 500);
  }

  return json(
    {
      pendingKitReviews: pendingKit.count ?? 0,
      openReports: openReports.count ?? 0,
      unreadFounderMessages: unreadMessages.count ?? 0,
      completedUsers: completed.count ?? 0,
      newUsersToday: newToday.count ?? 0,
    },
    200,
  );
});
