import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const TO = process.env.NOTIFY_EMAIL;
const FROM = process.env.NOTIFY_FROM ?? 'Arsenal Dating <onboarding@resend.dev>';

export async function notify(subject: string, text: string) {
  if (!resend || !TO) return;
  try {
    await resend.emails.send({ from: FROM, to: TO, subject, text });
  } catch (e) {
    console.error('notify failed:', e);
  }
}
