import { CannonMark } from '@/components/cannon-mark';
import { APP_URL } from '@/lib/site';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Stadium photo behind the headline. The image is faded then layered with
          a strong vertical dark gradient — text legibility wins over visuals. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-stadium.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-bg/80 via-bg/55 to-bg"
      />

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
        <div className="mt-9 flex flex-col items-center gap-4">
          <a
            href={APP_URL}
            className="inline-block rounded-card bg-red px-7 py-3.5 font-semibold text-white shadow-lg shadow-red/20 transition-colors hover:bg-red-dark"
          >
            Get started
          </a>
          <a
            href="#waitlist"
            className="text-sm font-semibold text-text-secondary transition-colors hover:text-text"
          >
            or join the waitlist →
          </a>
        </div>
        <CannonMark className="mx-auto mt-16 h-12 w-12 text-text-secondary/25" />
      </div>
    </section>
  );
}
