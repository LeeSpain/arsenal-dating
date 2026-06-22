import { createClient } from '@supabase/supabase-js';

import { notify } from '@/lib/notify';

// Server-side. Forwards landing-page contact-form submissions to the MAIN
// Supabase project's founder_messages table, using the anon/publishable key
// and the table's anon-insert RLS policy (no service key, no read-back).
export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Body = { name?: string; email?: string; message?: string };

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message || message.length > 2000) {
    return Response.json({ error: 'invalid_message' }, { status: 400 });
  }
  if (name && name.length > 100) {
    return Response.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (email && (email.length > 200 || !EMAIL_RE.test(email))) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }

  const url = process.env.MAIN_SUPABASE_URL;
  const key = process.env.MAIN_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ error: 'not_configured' }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from('founder_messages').insert({
    sender_name: name || null,
    sender_email: email || null,
    message,
  });

  if (error) {
    // The DB-level global rate-limit trigger surfaces with this prefix.
    if (error.message?.toLowerCase().includes('rate_limit')) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }
    return Response.json({ error: 'failed' }, { status: 500 });
  }
  await notify(
    `New message from ${name || 'someone'}`,
    `${message}\n\n— ${name || 'Anonymous'}${email ? ` <${email}>` : ' (no email)'}`,
  );
  return Response.json({ ok: true });
}
