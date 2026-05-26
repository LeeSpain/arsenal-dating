/**
 * One-shot image processor for the landing's editorial photos.
 *
 * - Crops the Gemini sparkle watermark off the bottom-right corner.
 * - Resizes to a sensible web width.
 * - Converts to mozjpeg-compressed JPEG.
 * - Renames to clean lowercase slugs.
 *
 * Run from the repo root:  node landing/scripts/optimize-images.mjs
 * Idempotent — skips targets that already exist; re-process by deleting them.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'images');

// Gemini watermark sits in the bottom-right corner. These margins clear it
// comfortably on the 2816×1536 source files.
const CROP_RIGHT = 220;
const CROP_BOTTOM = 200;

const targets = [
  { src: 'One.png', out: 'hero-stadium.jpg', width: 1600, quality: 78 },
  { src: 'Gemini_Generated_Image_83ocso83ocso83oc.png', out: 'fans-celebrating.jpg', width: 1600, quality: 78 },
  { src: 'Gemini_Generated_Image_c0oh28c0oh28c0oh (1).png', out: 'empty-pitch.jpg', width: 1200, quality: 78 },
  { src: 'Gemini_Generated_Image_srojdcsrojdcsroj.png', out: 'confetti.jpg', width: 1200, quality: 78 },
];

for (const t of targets) {
  const inPath = join(DIR, t.src);
  const outPath = join(DIR, t.out);
  if (!existsSync(inPath)) {
    console.log('skip', t.src, '(missing)');
    continue;
  }
  const meta = await sharp(inPath).metadata();
  const cropW = meta.width - CROP_RIGHT;
  const cropH = meta.height - CROP_BOTTOM;

  await sharp(inPath)
    .extract({ left: 0, top: 0, width: cropW, height: cropH })
    .resize({ width: t.width, withoutEnlargement: true })
    .jpeg({ quality: t.quality, mozjpeg: true })
    .toFile(outPath);

  console.log('wrote', t.out, `(${t.width}w, q${t.quality})`);
}

// Tidy up — drop the originals and macOS .DS_Store so the folder stays clean.
for (const t of targets) {
  const p = join(DIR, t.src);
  if (existsSync(p)) rmSync(p);
}
const ds = join(DIR, '.DS_Store');
if (existsSync(ds)) rmSync(ds);

console.log('\nFinal images:');
for (const f of readdirSync(DIR).sort()) {
  console.log(' ', f);
}
