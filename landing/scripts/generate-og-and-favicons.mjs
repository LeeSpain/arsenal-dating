/**
 * Generates the landing site's favicon set and the Open Graph share image.
 *
 * Favicons (16, 32, 192, 180-apple): rasterised from our cannon mark on the
 * DESIGN.md dark base — same visual as the app's PWA icon.
 *
 * OG image (1200×630): hero-stadium photo with a strong dark gradient and the
 * cannon mark + wordmark + tagline composited on top. Premium on-brand, all
 * text readable.
 *
 * Run from anywhere:  node landing/scripts/generate-og-and-favicons.mjs
 * Idempotent — re-running overwrites the outputs.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const BG = '#0E0F12';   // DESIGN.md dark base
const MARK = '#EF0107'; // Arsenal red

// Cannon mark in a 0..64 viewBox (matches landing/components/cannon-mark.tsx).
const cannon = (fill) => `
  <rect x="22" y="13" width="34" height="11" rx="5.5" transform="rotate(-22 22 13)" fill="${fill}"/>
  <rect x="50" y="4" width="7" height="15" rx="3.5" transform="rotate(-22 50 4)" fill="${fill}"/>
  <rect x="9" y="40" width="34" height="7" rx="3.5" transform="rotate(13 9 40)" fill="${fill}"/>
  <circle cx="22" cy="47" r="12" fill="none" stroke="${fill}" stroke-width="4"/>
  <circle cx="22" cy="47" r="2.6" fill="${fill}"/>
  <path d="M22 36.5 V57.5 M11.5 47 H32.5 M14.8 39.8 L29.2 54.2 M29.2 39.8 L14.8 54.2"
        stroke="${fill}" stroke-width="2" stroke-linecap="round"/>
`;

// Square cannon-on-dark icon at `size` × `size`, mark filling `fraction` of canvas.
function iconSvg(size, fraction) {
  const scale = (size * fraction) / 64;
  const offset = (size - size * fraction) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${cannon(MARK)}</g>
</svg>`;
}

// --- Favicons + apple touch icon ---
const iconTargets = [
  { name: 'favicon-16.png', size: 16, fraction: 0.66 },
  { name: 'favicon-32.png', size: 32, fraction: 0.62 },
  { name: 'icon-192.png', size: 192, fraction: 0.6 },
  { name: 'apple-touch-icon.png', size: 180, fraction: 0.62 },
];

for (const t of iconTargets) {
  await sharp(Buffer.from(iconSvg(t.size, t.fraction)))
    .png()
    .toFile(join(PUBLIC, t.name));
  console.log('wrote', t.name, `(${t.size}×${t.size})`);
}

// --- OG image (1200×630) ---
const heroPath = join(PUBLIC, 'images', 'hero-stadium.jpg');
if (!existsSync(heroPath)) {
  throw new Error(`OG image source missing: ${heroPath}`);
}

// Overlay: deep vertical gradient for legibility + cannon + wordmark + tagline.
// Font-family stack falls through to whatever the rasteriser has available —
// brand fidelity matters less here than composition + readability at preview
// scale (typical OG renders are 600px wide).
const ogOverlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="rgba(14,15,18,0.45)"/>
      <stop offset="55%" stop-color="rgba(14,15,18,0.78)"/>
      <stop offset="100%" stop-color="rgba(14,15,18,0.97)"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#g)"/>

  <!-- Cannon mark, left of wordmark, sized to align with the headline cap height. -->
  <g transform="translate(80 380) scale(1.5)">${cannon('#FFFFFF')}</g>

  <!-- Wordmark -->
  <text x="195" y="460" fill="#FFFFFF"
        font-family="Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="76" font-weight="800" letter-spacing="-1">Arsenal Dating</text>

  <!-- Tagline -->
  <text x="80" y="530" fill="#FFFFFF"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="30" font-weight="500" opacity="0.95">Built by a Gooner, for Gooners.</text>

  <!-- Subline -->
  <text x="80" y="572" fill="#A8ADB5"
        font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-size="22" font-weight="400">A dating and community app for Arsenal supporters worldwide.</text>
</svg>`;

await sharp(heroPath)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .composite([{ input: Buffer.from(ogOverlay), top: 0, left: 0 }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(join(PUBLIC, 'og-image.jpg'));
console.log('wrote og-image.jpg (1200×630, q82)');
