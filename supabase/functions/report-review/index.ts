// report-review — founder-only moderation queue.
//
// SECURITY: is_admin enforced server-side (service-role lookup of the caller),
// not by hiding the screen. A non-admin gets 403.
//
//   GET  -> list open/reviewing reports (+ reporter/reported names, signed photo,
//           reported user's suspended state, and how many reports they have)
//   POST -> { reportId, action }
//           action: 'reviewing' | 'dismiss' | 'resolve' | 'suspend' | 'unsuspend' | 'remove'
//
// suspend = is_suspended flag + Supabase auth ban (login blocked); reversible.
// remove  = full erasure (storage + auth user -> cascade), irreversible.
//
// Deploy: supabase functions deploy report-review
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const USER_BUCKETS = ['photos', 'kit-photos'];
const BAN_DURATION = '87600h'; // ~10 years; cleared on unsuspend

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

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'invalid session' }, 401);

  // SERVER-SIDE admin check.
  const { data: me } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('auth_id', userData.user.id)
    .maybeSingle();
  if (!me?.is_admin) return json({ error: 'forbidden' }, 403);

  async function profileName(id: string): Promise<string | null> {
    const { data } = await admin.from('profiles').select('display_name').eq('id', id).maybeSingle();
    return (data?.display_name as string) ?? null;
  }

  if (req.method === 'GET') {
    const { data: reports, error } = await admin
      .from('reports')
      .select('id, reporter_id, reported_id, reason, details, status, created_at')
      .in('status', ['open', 'reviewing'])
      .order('created_at', { ascending: true });
    if (error) return json({ error: error.message }, 500);

    const items = [];
    for (const r of reports ?? []) {
      const { data: reported } = await admin
        .from('profiles')
        .select('id, display_name, is_suspended')
        .eq('id', r.reported_id as string)
        .maybeSingle();
      let photoUrl: string | null = null;
      const { data: photo } = await admin
        .from('photos')
        .select('url')
        .eq('profile_id', r.reported_id as string)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (photo?.url) {
        const { data: s } = await admin.storage.from('photos').createSignedUrl(photo.url as string, 3600);
        photoUrl = s?.signedUrl ?? null;
      }
      const { count } = await admin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('reported_id', r.reported_id as string);

      items.push({
        reportId: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.created_at,
        reporterName: await profileName(r.reporter_id as string),
        reportedId: r.reported_id,
        reportedName: reported?.display_name ?? null,
        reportedSuspended: !!reported?.is_suspended,
        reportedPhotoUrl: photoUrl,
        reportsAgainstUser: count ?? 1,
      });
    }
    return json({ items }, 200);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { reportId, action } = body as { reportId?: string; action?: string };
    const ACTIONS = ['reviewing', 'dismiss', 'resolve', 'suspend', 'unsuspend', 'remove'];
    if (!reportId || !action || !ACTIONS.includes(action)) return json({ error: 'bad request' }, 400);

    const { data: report } = await admin
      .from('reports')
      .select('id, reported_id')
      .eq('id', reportId)
      .maybeSingle();
    if (!report) return json({ error: 'report not found' }, 404);
    const reportedId = report.reported_id as string;

    const { data: reported } = await admin
      .from('profiles')
      .select('auth_id')
      .eq('id', reportedId)
      .maybeSingle();
    const authId = reported?.auth_id as string | undefined;

    if (action === 'reviewing' || action === 'dismiss' || action === 'resolve') {
      const status = action === 'reviewing' ? 'reviewing' : action === 'dismiss' ? 'dismissed' : 'resolved';
      await admin.from('reports').update({ status }).eq('id', reportId);
      return json({ ok: true }, 200);
    }

    if (action === 'suspend') {
      await admin.from('profiles').update({ is_suspended: true }).eq('id', reportedId);
      if (authId) await admin.auth.admin.updateUserById(authId, { ban_duration: BAN_DURATION });
      await admin.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      return json({ ok: true }, 200);
    }

    if (action === 'unsuspend') {
      await admin.from('profiles').update({ is_suspended: false }).eq('id', reportedId);
      if (authId) await admin.auth.admin.updateUserById(authId, { ban_duration: 'none' });
      return json({ ok: true }, 200);
    }

    if (action === 'remove') {
      if (authId) {
        for (const bucket of USER_BUCKETS) {
          try {
            const { data: files } = await admin.storage.from(bucket).list(authId, { limit: 1000 });
            if (files && files.length) {
              await admin.storage.from(bucket).remove(files.map((f) => `${authId}/${f.name}`));
            }
          } catch (_e) { /* bucket may not exist */ }
        }
        await admin.auth.admin.deleteUser(authId); // cascades all DB rows incl. the report
      }
      return json({ ok: true }, 200);
    }

    return json({ error: 'bad request' }, 400);
  }

  return json({ error: 'method not allowed' }, 405);
});
