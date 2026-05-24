'use client';

import Link from 'next/link';
import { useState } from 'react';

import { APP_URL } from '@/lib/site';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      if (res.ok) {
        setStatus('done');
        return;
      }
      setStatus('error');
      if (res.status === 400) setError('That email doesn’t look right.');
      else if (res.status === 503) setError('The waitlist opens shortly — please check back soon.');
      else setError('Something went wrong — please try again.');
    } catch {
      setStatus('error');
      setError('Something went wrong — please try again.');
    }
  }

  return (
    <section id="waitlist" className="mx-auto max-w-content px-6 py-16">
      <div className="mx-auto max-w-xl rounded-card border border-border bg-surface p-8 text-center sm:p-10">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Be first in when we launch</h2>
        <p className="mt-3 text-text-secondary">
          Create your profile in the app and start meeting fellow Gooners.
        </p>

        <div className="mt-6">
          <a
            href={APP_URL}
            className="inline-block rounded-card bg-red px-7 py-3.5 font-semibold text-white shadow-lg shadow-red/20 transition-colors hover:bg-red-dark"
          >
            Get started
          </a>
        </div>

        {/* Secondary path: get notified by email while we finish building. */}
        <div className="mt-8 border-t border-border pt-6">
          {status === 'done' ? (
            <div className="rounded-input border border-gold/40 bg-raised p-5">
              <p className="font-semibold text-gold">You’re on the list ✦</p>
              <p className="mt-1 text-sm text-text-secondary">We’ll be in touch when we launch. COYG.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Prefer a nudge at launch? Drop your email and we’ll let you know.
              </p>
              <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="flex-1 rounded-input border border-border bg-raised px-4 py-3 text-text outline-none transition-colors placeholder:text-text-secondary focus:border-red"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-card border border-border px-6 py-3 font-semibold text-text transition-colors hover:border-text-secondary disabled:opacity-50"
                >
                  {status === 'loading' ? 'Joining…' : 'Notify me'}
                </button>
              </form>
            </>
          )}

          {status === 'error' ? <p className="mt-3 text-sm text-[#E5484D]">{error}</p> : null}
          {status !== 'done' ? (
            <p className="mt-3 text-xs text-text-secondary">
              No spam — just one email when we launch. By joining, you agree to our{' '}
              <Link href="/privacy" className="underline transition-colors hover:text-text">
                Privacy Policy
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
