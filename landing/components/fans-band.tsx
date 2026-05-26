// Full-width mid-page band — the strongest of the four photos.
// Edge-to-edge, no max-content cap. Soft vignettes at top + bottom so the band
// blends into the dark page above and below (no hard seam). No overlaid text —
// the image is the moment.
export function FansBand() {
  return (
    <section aria-label="Matchday" className="relative overflow-hidden">
      <div className="relative h-72 w-full sm:h-96 md:h-[26rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fans-celebrating.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent" />
      </div>
    </section>
  );
}
