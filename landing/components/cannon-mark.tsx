// Original, cannon-INSPIRED mark — stylised and our own. Deliberately NOT Arsenal's
// crest/official cannon (trademark): a chunky field-gun silhouette with a bold
// spoked wheel. Single-colour (currentColor) so it can be tinted.
export function CannonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* barrel */}
      <rect x="22" y="13" width="34" height="11" rx="5.5" transform="rotate(-22 22 13)" fill="currentColor" />
      {/* muzzle cap */}
      <rect x="50" y="4" width="7" height="15" rx="3.5" transform="rotate(-22 50 4)" fill="currentColor" />
      {/* carriage trail */}
      <rect x="9" y="40" width="34" height="7" rx="3.5" transform="rotate(13 9 40)" fill="currentColor" />
      {/* wheel */}
      <circle cx="22" cy="47" r="12" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="22" cy="47" r="2.6" fill="currentColor" />
      <path
        d="M22 36.5 V57.5 M11.5 47 H32.5 M14.8 39.8 L29.2 54.2 M29.2 39.8 L14.8 54.2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
