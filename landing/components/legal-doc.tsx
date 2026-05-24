import Link from 'next/link';

export type LegalSection = { heading: string; paragraphs: string[] };

export function LegalDoc({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-text-secondary transition-colors hover:text-text">
        ← Back to home
      </Link>
      <h1 className="mt-6 font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {updated} · Initial version — pending final legal review
      </p>
      <p className="mt-6 leading-relaxed text-text-secondary">{intro}</p>

      {sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-display text-lg font-bold">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-3 leading-relaxed text-text-secondary">
              {p}
            </p>
          ))}
        </section>
      ))}

      <p className="mt-12 border-t border-border pt-6 text-sm text-text-secondary">
        An independent fan project. Not affiliated with, endorsed by, or connected to Arsenal
        Football Club.
      </p>
    </main>
  );
}
