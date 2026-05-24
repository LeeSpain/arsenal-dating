import { CannonMark } from '@/components/cannon-mark';
import { APP_URL } from '@/lib/site';

export function Header() {
  return (
    <header className="mx-auto flex max-w-content items-center justify-between px-6 py-5">
      <div className="flex items-center gap-3">
        <CannonMark className="h-7 w-7 text-red" />
        <span className="font-display text-lg font-extrabold tracking-tight">Arsenal Dating</span>
        <span className="ml-1 rounded-full border border-gold/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
          Coming soon
        </span>
      </div>
      <a
        href={APP_URL}
        className="hidden rounded-card border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-text-secondary sm:inline-block"
      >
        Get started
      </a>
    </header>
  );
}
