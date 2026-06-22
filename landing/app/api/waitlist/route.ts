import { createClient } from '@supabase/supabase-js';

import { notify } from '@/lib/notify';

// Server-side only. Reads the LANDING Supabase project's env (never the app's).
// Inserts via the anon key + an insert-only RLS policy, so the list can't be read
// back through the API.
//
// CORS: the app at app.arsenaldating.com calls this endpoint from its Coming
// Soon screen, so we allow that one origin (and nothing else) to POST here.
export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ALLOWED_ORIGIN = 'https://app.arsenaldating.com';
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: { ...corsHeaders, ...(init.headers ?? {}) },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '');
  } catch {
    return json({ error: 'bad_request' }, { status: 400 });
  }
  email = email.trim().toLowerCase();
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return json({ error: 'invalid_email' }, { status: 400 });
  }

  const url = process.env.LANDING_SUPABASE_URL;
  const key = process.env.LANDING_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return json({ error: 'not_configured' }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('waitlist').insert({ email });
  if (error) {
    // Already signed up — treat as success (don't reveal membership).
    if (error.code === '23505') return json({ ok: true, already: true });
    return json({ error: 'failed' }, { status: 500 });
  }
  await notify('New waitlist signup', `${email} just joined the waitlist.`);
  return json({ ok: true });
}
