import Link from 'next/link';

import { CannonMark } from '@/components/cannon-mark';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-content px-6 py-10">
        <div className="flex items-center gap-2">
          <CannonMark className="h-5 w-5 text-text-secondary" />
          <span className="font-display text-sm font-bold">Arsenal Dating</span>
        </div>
        {/* Required disclaimer — verbatim. */}
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
          An independent fan project. Not affiliated with, endorsed by, or connected to Arsenal
          Football Club.
        </p>
        <nav className="mt-4 flex gap-6 text-sm">
          <Link href="/privacy" className="text-text-secondary transition-colors hover:text-text">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-text-secondary transition-colors hover:text-text">
            Terms of Use
          </Link>
        </nav>
        <p className="mt-4 text-xs text-text-secondary">
          © {new Date().getFullYear()} Arsenal Dating · Built by a Gooner, for Gooners.
        </p>
      </div>
    </footer>
  );
}
