import { CannonMark } from '@/components/cannon-mark';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Matchday glow — navy depth + a faint gold. No red at scale (DESIGN.md). */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-[-12%] h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-navy/30 blur-[130px]" />
        <div className="absolute left-[22%] top-[28%] h-[240px] w-[240px] rounded-full bg-gold/10 blur-[110px]" />
      </div>

      <div className="mx-auto max-w-content px-6 pb-20 pt-12 text-center sm:pt-16">
        <p className="mb-6 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-gold">
          <span className="h-px w-6 bg-gold/60" /> Coming soon
        </p>
        <h1 className="font-hero text-[2.5rem] font-extrabold leading-[1.05] sm:text-6xl">
          Built by a Gooner,
          <br />
          for Gooners.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
          A dating and community app for Arsenal supporters worldwide — to meet people who share
          the obsession. We’re building it now.
        </p>
        <div className="mt-9">
          <a
            href="#waitlist"
            className="inline-block rounded-card bg-red px-7 py-3.5 font-semibold text-white shadow-lg shadow-red/20 transition-colors hover:bg-red-dark"
          >
            Be first in when we launch
          </a>
        </div>
        <CannonMark className="mx-auto mt-16 h-12 w-12 text-text-secondary/25" />
      </div>
    </section>
  );
}
