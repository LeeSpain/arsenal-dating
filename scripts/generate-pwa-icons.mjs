/**
 * Generates the PWA icon set from our original cannon-inspired mark (the same
 * geometry as the in-app/landing CannonMark — NOT Arsenal's crest). Brand red
 * mark on the DESIGN.md dark base (#0E0F12).
 *
 * Run: node scripts/generate-pwa-icons.mjs   (needs `sharp` available)
 * Output: public/icons/*.png
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const BG = '#0E0F12'; // DESIGN.md dark base
const MARK = '#EF0107'; // Arsenal red accent

// Cannon mark in a 0..64 viewBox (matches components/cannon-mark.tsx).
const cannon = (fill) => `
  <rect x="22" y="13" width="34" height="11" rx="5.5" transform="rotate(-22 22 13)" fill="${fill}"/>
  <rect x="50" y="4" width="7" height="15" rx="3.5" transform="rotate(-22 50 4)" fill="${fill}"/>
  <rect x="9" y="40" width="34" height="7" rx="3.5" transform="rotate(13 9 40)" fill="${fill}"/>
  <circle cx="22" cy="47" r="12" fill="none" stroke="${fill}" stroke-width="4"/>
  <circle cx="22" cy="47" r="2.6" fill="${fill}"/>
  <path d="M22 36.5 V57.5 M11.5 47 H32.5 M14.8 39.8 L29.2 54.2 M29.2 39.8 L14.8 54.2"
        stroke="${fill}" stroke-width="2" stroke-linecap="round"/>
`;

// Build a full-bleed square icon SVG. `fraction` is how much of the canvas the
// mark fills — smaller for maskable so the mark stays inside the safe zone.
function iconSvg(size, fraction) {
  const scale = (size * fraction) / 64;
  const offset = (size - size * fraction) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${cannon(MARK)}</g>
</svg>`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// any: ~0.62 fill (square icon, launcher applies its own rounding/mask)
// maskable: ~0.50 fill (stays within Android's inner 80% safe zone)
const targets = [
  { name: 'icon-192.png', size: 192, fraction: 0.62 },
  { name: 'icon-512.png', size: 512, fraction: 0.62 },
  { name: 'icon-maskable-192.png', size: 192, fraction: 0.5 },
  { name: 'icon-maskable-512.png', size: 512, fraction: 0.5 },
  { name: 'apple-touch-icon.png', size: 180, fraction: 0.62 }, // iOS rounds corners itself
];

for (const t of targets) {
  await sharp(Buffer.from(iconSvg(t.size, t.fraction))).png().toFile(join(outDir, t.name));
  console.log('wrote', join('public/icons', t.name), `(${t.size}x${t.size})`);
}
