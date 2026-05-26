export function Why() {
  return (
    <section className="mx-auto max-w-content px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-card border border-border bg-surface">
        {/* Quiet, atmospheric banner — empty pitch under the lights. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/empty-pitch.jpg"
          alt="An empty pitch under floodlights"
          className="h-44 w-full object-cover sm:h-56"
        />
        <div className="p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold">Why this exists</h2>
          <p className="mt-4 leading-relaxed text-text-secondary">
            This isn’t a faceless corporation. It’s one Arsenal fan building the thing they wished
            existed — a learning start-up and a genuine passion project. No big team, no investors,
            no hype.
          </p>
          <p className="mt-4 leading-relaxed text-text-secondary">
            It’ll be rough around the edges as it grows, and that’s part of the deal. Honest,
            grassroots, fan-to-fan. If that sounds like your kind of thing, get on the list — thanks
            for being here early.
          </p>
        </div>
      </div>
    </section>
  );
}
