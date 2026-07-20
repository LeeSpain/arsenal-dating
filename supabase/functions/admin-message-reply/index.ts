// admin-message-reply — founder-only reply to an inbox message.
//
// SECURITY: is_admin enforced server-side (service-role lookup of the caller),
// not by hiding the screen. A non-admin gets 403.
//
//   POST -> { messageId, body }
//           emails the original sender via Resend, records the reply in
//           founder_message_replies, and marks the message replied + read.
//
// Secrets come from Deno.env only — never hardcoded:
//   RESEND_API_KEY   required to send
//   REPLY_FROM       optional from-address; falls back to the Resend sandbox
//   NOTIFY_EMAIL     optional; used as reply-to so the sender's reply reaches
//                    the founder's inbox
//
// Deploy: supabase functions deploy admin-message-reply
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const FALLBACK_FROM = 'Arsenal Dating <onboarding@resend.dev>';

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

  // SERVER-SIDE admin check (also grabs the admin's profile id for sent_by).
  const { data: me } = await admin
    .from('profiles')
    .select('id, is_admin')
    .eq('auth_id', userData.user.id)
    .maybeSingle();
  if (!me?.is_admin) return json({ error: 'forbidden' }, 403);

  const parsed = await req.json().catch(() => ({}));
  const { messageId, body } = parsed as { messageId?: string; body?: string };
  const replyBody = typeof body === 'string' ? body.trim() : '';
  if (!messageId || !replyBody) return json({ error: 'bad request' }, 400);
  if (replyBody.length > 5000) return json({ error: 'reply too long' }, 400);

  // Fetch the message we're replying to.
  const { data: msg } = await admin
    .from('founder_messages')
    .select('id, sender_email, sender_name')
    .eq('id', messageId)
    .maybeSingle();
  if (!msg) return json({ error: 'message not found' }, 404);

  const senderEmail = (msg.sender_email as string | null)?.trim() ?? '';
  const senderName = (msg.sender_name as string | null) ?? '';
  if (!senderEmail) return json({ error: 'this message has no sender email to reply to' }, 400);

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'email not configured' }, 503);

  const from = Deno.env.get('REPLY_FROM') ?? FALLBACK_FROM;
  const notifyEmail = Deno.env.get('NOTIFY_EMAIL');
  const greeting = senderName ? `Hi ${senderName},\n\n` : '';

  const payload: Record<string, unknown> = {
    from,
    to: [senderEmail],
    subject: 'Re: your message to Arsenal Dating',
    text: `${greeting}${replyBody}\n\n— Arsenal Dating`,
  };
  if (notifyEmail) payload.reply_to = notifyEmail;

  // Send the email. If Resend rejects it, stop here — don't record a reply that
  // never went out.
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!emailRes.ok) {
    const detail = await emailRes.text().catch(() => '');
    return json({ error: 'email send failed', detail: detail.slice(0, 500) }, 502);
  }

  // Record the reply, then mark the message replied + read.
  const { error: insErr } = await admin
    .from('founder_message_replies')
    .insert({ message_id: messageId, body: replyBody, sent_by: me.id });
  if (insErr) return json({ error: insErr.message }, 500);

  await admin
    .from('founder_messages')
    .update({ replied_at: new Date().toISOString(), is_read: true })
    .eq('id', messageId);

  return json({ ok: true }, 200);
});
