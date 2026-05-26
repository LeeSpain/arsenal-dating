'use client';

import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

// Founder contact form. Posts to /api/contact which forwards to the MAIN
// Supabase project's founder_messages table (anon insert, admin reads in-app).
// DESIGN.md: dark base, red as the only accent, premium and uncluttered.
export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) {
      setError('Drop a quick line first.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: text }),
      });
      if (res.ok) {
        setStatus('sent');
        return;
      }
      setStatus('error');
      if (res.status === 400) setError('That doesn’t look quite right — give it another go.');
      else if (res.status === 429) setError('Hold up — too many messages right now. Try again in a bit.');
      else if (res.status === 503) setError('The inbox isn’t live yet — please try again soon.');
      else setError('Something went wrong — please try again.');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again.');
    }
  }

  return (
    <section id="contact" className="mx-auto max-w-content px-6 pb-20 pt-8">
      <div className="mx-auto max-w-xl rounded-card border border-border bg-surface p-8 sm:p-10">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Say hello</h2>
          <p className="mx-auto mt-3 max-w-md text-text-secondary">
            Got a question, an idea, or just want to say hello? I’d love to hear from you.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="mx-auto mt-6 max-w-md rounded-input border border-gold/40 bg-raised p-5 text-center">
            <p className="font-semibold text-gold">Thanks — I’ll read every message personally.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              aria-label="Your name"
              maxLength={100}
              className="rounded-input border border-border bg-raised px-4 py-3 text-text outline-none transition-colors placeholder:text-text-secondary focus:border-red"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (optional, so I can reply)"
              aria-label="Your email"
              maxLength={200}
              className="rounded-input border border-border bg-raised px-4 py-3 text-text outline-none transition-colors placeholder:text-text-secondary focus:border-red"
            />
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What’s on your mind?"
              aria-label="Message"
              rows={5}
              maxLength={2000}
              className="resize-y rounded-input border border-border bg-raised px-4 py-3 text-text outline-none transition-colors placeholder:text-text-secondary focus:border-red"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-card bg-red px-6 py-3 font-semibold text-white transition-colors hover:bg-red-dark disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
            {status === 'error' ? (
              <p className="text-sm text-[#E5484D]">{error}</p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
