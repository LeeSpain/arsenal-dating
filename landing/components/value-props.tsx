import type { ReactNode } from 'react';

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5 7.5 5.5 9 7 12 9c3-2 4.5-3.5 6.5-3.5 3 0 4.5 3 3 6C19 15.65 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15.5 14.2c2.4.2 4.5 2 4.5 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const props: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Meet fellow obsessives',
    body: 'Match with people who actually live and breathe the Arsenal — not a casual “yeah, I like a bit of footy.”',
    icon: <HeartIcon />,
  },
  {
    title: 'Safe & respectful',
    body: 'Women message first, and report & block are built in from day one. A space that respects everyone in it.',
    icon: <ShieldIcon />,
  },
  {
    title: 'Real community',
    body: 'Belonging and matchday mates — not an endless swipe carousel. A proper home for the Gooner family.',
    icon: <PeopleIcon />,
  },
];

export function ValueProps() {
  return (
    <section className="mx-auto max-w-content px-6 py-12 sm:py-16">
      <div className="grid gap-6 sm:grid-cols-3">
        {props.map((p) => (
          <div key={p.title} className="rounded-card border border-border bg-surface p-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-input bg-raised text-red">
              {p.icon}
            </div>
            <h3 className="font-display text-lg font-bold">{p.title}</h3>
            <p className="mt-2 leading-relaxed text-text-secondary">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
