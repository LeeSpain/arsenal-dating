import { createClient } from '@supabase/supabase-js';

import { notify } from '@/lib/notify';

// Server-side only. Reads the LANDING Supabase project's env (never the app's).
// Inserts via the anon key + an insert-only RLS policy, so the list can't be read
// back through the API.
export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '');
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  email = email.trim().toLowerCase();
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }

  const url = process.env.LANDING_SUPABASE_URL;
  const key = process.env.LANDING_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ error: 'not_configured' }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('waitlist').insert({ email });
  if (error) {
    // Already signed up — treat as success (don't reveal membership).
    if (error.code === '23505') return Response.json({ ok: true, already: true });
    return Response.json({ error: 'failed' }, { status: 500 });
  }
  await notify('New waitlist signup', `${email} just joined the waitlist.`);
  return Response.json({ ok: true });
}
