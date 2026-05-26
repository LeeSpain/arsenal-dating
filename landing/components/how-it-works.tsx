import { CannonMark } from '@/components/cannon-mark';

// Three illustrative deck cards. Layout mirrors the in-app SwipeCard: full-bleed
// photo area with a name/details overlay along the bottom. DESIGN.md compliant:
// dark base, red as accent only (the LIKE stamp), gold reserved for the shared-
// Arsenal-trait line — the actual product differentiator.
//
// The disclaimer in the section heading makes it explicit these are illustrative
// examples, not real members.

type Example = {
  name: string;
  age: number;
  city: string;
  favourite: string;
  shared: string;
  bio: string;
  hint?: 'like' | 'pass';
  /** Photo path under /public/images. When absent, the card falls back to the
      cannon-on-dark-gradient placeholder. */
  photo?: string;
};

const EXAMPLES: Example[] = [
  {
    name: 'Sam',
    age: 28,
    city: 'North London',
    favourite: 'Thierry Henry',
    shared: 'You both love the Invincibles',
    bio: 'Highbury history nerd. Still hasn’t recovered from Paris 2006.',
    hint: 'like',
    photo: '/images/card-sam.jpg',
  },
  {
    name: 'Joel',
    age: 31,
    city: 'Highbury',
    favourite: 'Bukayo Saka',
    shared: 'You both pick Saka as your #1',
    bio: 'Five-a-side Tuesdays. Always playing left back.',
    photo: '/images/card-joel.jpg',
  },
  {
    name: 'Maya',
    age: 26,
    city: 'Hackney',
    favourite: 'Ian Wright',
    shared: 'You both love Ian Wright',
    bio: 'Loud at the Emirates, quiet everywhere else.',
    photo: '/images/card-maya.jpg',
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-content px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">A taste of your deck</h2>
        <p className="mt-3 text-text-secondary">
          Profiles, illustrated. These aren’t real members — they’re examples of how the Arsenal
          details surface in your deck, with the trait you share in gold.
        </p>
      </div>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <li key={ex.name}>
            <DeckCard {...ex} />
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-xs text-text-secondary">
        Swipe right to <span className="font-semibold text-text">like</span>, left to{' '}
        <span className="font-semibold text-text">pass</span>. The{' '}
        <span className="font-semibold text-gold">gold line</span> is the trait you share.
      </p>
    </section>
  );
}

function DeckCard({ name, age, city, favourite, shared, bio, hint, photo }: Example) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-border bg-black">
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Light fade behind the info overlay only — keeps the photo above
              fully clear so the face never has to fight a gradient. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
        </>
      ) : (
        <>
          {/* Fallback placeholder: dark gradient with a deep-red hint and our
              own cannon mark at very low opacity — premium and on-brand. */}
          <div className="absolute inset-0 bg-gradient-to-tr from-bg via-[#180b0e] to-[#2a1216]" />
          <CannonMark className="absolute -right-6 top-6 h-44 w-44 text-red/[0.08]" />
        </>
      )}

      {/* Swipe hint, shown on one card so the mechanic is obvious. */}
      {hint === 'like' ? (
        <div className="absolute right-4 top-4 rotate-12 rounded-md border-2 border-red px-3 py-0.5 font-extrabold tracking-widest text-white">
          LIKE
        </div>
      ) : null}
      {hint === 'pass' ? (
        <div className="absolute left-4 top-4 -rotate-12 rounded-md border-2 border-[#E5484D] px-3 py-0.5 font-extrabold tracking-widest text-white">
          PASS
        </div>
      ) : null}

      {/* Info overlay — same shape as the in-app swipe card. */}
      <div className="absolute inset-x-0 bottom-0 bg-black/55 p-4 backdrop-blur-sm">
        <div className="font-display text-xl font-extrabold text-white">
          {name}, {age}
        </div>
        <div className="mt-1 text-sm text-white/80">{city}</div>
        <div className="mt-0.5 text-sm text-white/80">Favourite: {favourite}</div>
        <div className="mt-2 text-sm font-semibold text-gold">{shared}</div>
        <div className="mt-2 line-clamp-2 text-sm text-white/75">{bio}</div>
      </div>
    </div>
  );
}
