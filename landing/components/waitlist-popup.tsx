'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// One-time waitlist nudge. Shows a centered modal 5s after mount, but only if
// the user hasn't already seen it in this browser. Submitting OR dismissing
// sets the localStorage flag so it never shows again.
const STORAGE_KEY = 'arsenal-waitlist-popup-v1';
const DELAY_MS = 5_000;

// Same shape + error copy as components/waitlist.tsx — kept in sync deliberately.
type Status = 'idle' | 'loading' | 'done' | 'error';

export function WaitlistPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Arm the 10s timer once, unless this browser has already seen the popup.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) != null;
    } catch {
      /* ignore — privacy mode / disabled storage */
    }
    if (seen) return;
    const id = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  // Persist the "seen" flag so the popup never reappears in this browser.
  function markSeen() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  function dismiss() {
    markSeen();
    setOpen(false);
  }

  // On open: focus the email input and wire Esc-to-close.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Submission logic + status transitions + error copy mirror
  // components/waitlist.tsx exactly.
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
        body: JSON.stringify({ email: value, source: 'landing' }),
      });
      if (res.ok) {
        setStatus('done');
        markSeen();
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-popup-title"
        className="relative w-full max-w-md rounded-card border border-border bg-surface p-8 text-text shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 text-text-secondary transition-colors hover:text-text"
        >
          ✕
        </button>

        {status === 'done' ? (
          <div className="text-center">
            <p id="waitlist-popup-title" className="font-display text-xl font-bold text-gold">
              You’re on the list ✦
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              We’ll be in touch when we launch. COYG.
            </p>
          </div>
        ) : (
          <>
            <h2 id="waitlist-popup-title" className="font-display text-2xl font-bold">
              Be first in when we launch
            </h2>
            <p className="mt-2 text-text-secondary">
              Drop your email and we’ll let you know the moment Arsenal Dating goes live.
            </p>

            <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
              <input
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="w-full rounded-input border border-border bg-raised px-4 py-3 text-text outline-none transition-colors placeholder:text-text-secondary focus:border-red"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-input bg-red px-6 py-3 font-semibold text-white transition-colors hover:bg-red-dark disabled:opacity-50"
              >
                {status === 'loading' ? 'Joining…' : 'Join the waitlist'}
              </button>
            </form>

            {status === 'error' ? <p className="mt-3 text-sm text-[#E5484D]">{error}</p> : null}

            <p className="mt-3 text-xs text-text-secondary">
              No spam — just one email when we launch. By joining, you agree to our{' '}
              <Link href="/privacy" className="underline transition-colors hover:text-text">
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
