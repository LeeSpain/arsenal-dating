// Quiet "founder's voice" contact block above the footer. No form, no card —
// just a sincere line and a clickable email. DESIGN.md: dark base, red as the
// only accent, generous whitespace.
export function Contact() {
  return (
    <section className="mx-auto max-w-content px-6 pb-20 pt-8 text-center">
      <h2 className="font-display text-xl font-bold sm:text-2xl">Say hello</h2>
      <p className="mx-auto mt-3 max-w-md text-text-secondary">
        Got a question, an idea, or just want to say hello? I’d love to hear from you.
      </p>
      <a
        href="mailto:hello@arsenaldating.com"
        className="mt-6 inline-block font-display text-lg font-bold text-red transition-colors hover:text-red-dark sm:text-xl"
      >
        hello@arsenaldating.com
      </a>
    </section>
  );
}
