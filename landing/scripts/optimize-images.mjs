/**
 * One-shot image processor for the landing's editorial photos.
 *
 * - Crops the Gemini sparkle watermark off the bottom-right corner.
 * - Resizes to a sensible web width (and optionally a 3:4 portrait cover
 *   crop with attention-based gravity for the example-card portraits).
 * - Converts to mozjpeg-compressed JPEG.
 * - Renames to clean lowercase slugs.
 *
 * Run from the repo root:  node landing/scripts/optimize-images.mjs
 * Idempotent — skips sources that are no longer present; re-process by
 * deleting an output and putting its source back in landing/public/images/.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'images');

// Default watermark margins. Each target may override; the Gemini sparkle is
// roughly proportional to the source size so portraits need smaller margins.
const DEFAULT_CROP_RIGHT = 220;
const DEFAULT_CROP_BOTTOM = 200;

const targets = [
  // Editorial photography (the original four).
  { src: 'One.png', out: 'hero-stadium.jpg', width: 1600, quality: 78 },
  { src: 'Gemini_Generated_Image_83ocso83ocso83oc.png', out: 'fans-celebrating.jpg', width: 1600, quality: 78 },
  { src: 'Gemini_Generated_Image_c0oh28c0oh28c0oh (1).png', out: 'empty-pitch.jpg', width: 1200, quality: 78 },
  { src: 'Gemini_Generated_Image_srojdcsrojdcsroj.png', out: 'confetti.jpg', width: 1200, quality: 78 },

  // Example-card portraits. 3:4 portrait crop with attention-based gravity so
  // the face stays in frame regardless of the source aspect (Sam is landscape;
  // Maya + Joel are portrait). The card area is aspect-[3/4] with object-cover,
  // so shipping at 720×960 is plenty for retina at the rendered card size.
  // Card portraits: face must end up in the UPPER ~30% of the 720×960 output
  // so the bottom info-overlay never covers it. Each target gets an explicit
  // `extract` region picked from the source by inspecting the face position —
  // this is more reliable than sharp's `attention` heuristic, which misfires
  // on bokeh/soft-focus portraits.
  //
  // Coordinates are calibrated against the actual source dimensions; update
  // them if you replace a source PNG with one whose framing differs.
  // Maya: face centre at source ~ (768, 1095). Extract puts face at ~30%
  // from the top of the 720×960 output.
  {
    src: 'maya.png',
    out: 'card-maya.jpg',
    width: 720,
    height: 960,
    quality: 78,
    extract: { left: 0, top: 561, width: 1336, height: 1781 },
  },
  // Sam (stadium portrait): face centre at source ~ (1408, 584). The source is
  // landscape so the maximum 3:4 portrait extract is 1002×1336 — that's the
  // widest we can zoom out, putting the face at a similar size + headroom to
  // Maya/Joel rather than the over-tight crop of a smaller extract.
  {
    src: 'sam.png',
    out: 'card-sam.jpg',
    width: 720,
    height: 960,
    quality: 78,
    extract: { left: 907, top: 150, width: 1002, height: 1336 },
  },
  // Joel: face centre at source ~ (768, 1183). Extract puts face at ~30%.
  {
    src: 'Joel.png',
    out: 'card-joel.jpg',
    width: 720,
    height: 960,
    quality: 78,
    extract: { left: 0, top: 649, width: 1336, height: 1781 },
  },
];

for (const t of targets) {
  const inPath = join(DIR, t.src);
  const outPath = join(DIR, t.out);
  if (!existsSync(inPath)) {
    console.log('skip', t.src, '(missing)');
    continue;
  }
  const meta = await sharp(inPath).metadata();

  let pipeline;
  if (t.extract) {
    // Explicit face-positioning extract. The region is chosen so the face lands
    // in the upper third of the output, clear of the bottom info overlay.
    pipeline = sharp(inPath).extract(t.extract);
  } else {
    // Default: chop the watermark off the bottom-right corner.
    const cropRight = t.cropRight ?? DEFAULT_CROP_RIGHT;
    const cropBottom = t.cropBottom ?? DEFAULT_CROP_BOTTOM;
    pipeline = sharp(inPath).extract({
      left: 0,
      top: 0,
      width: meta.width - cropRight,
      height: meta.height - cropBottom,
    });
  }

  if (t.height) {
    // Resize to exact target. When the extract is already 3:4 (as for the card
    // portraits), this is a clean scale; otherwise `cover` + the requested
    // `position` handles the aspect mismatch.
    pipeline.resize({
      width: t.width,
      height: t.height,
      fit: t.fit ?? 'cover',
      position: t.position ?? sharp.strategy.attention,
    });
  } else {
    pipeline.resize({ width: t.width, withoutEnlargement: true });
  }

  await pipeline.jpeg({ quality: t.quality, mozjpeg: true }).toFile(outPath);
  console.log('wrote', t.out, `(${t.width}${t.height ? 'x' + t.height : 'w'}, q${t.quality})`);
}

// Non-destructive: leave the originals in place. Delete them by hand once
// you're happy with the outputs — that way a bad crop can always be re-tuned.
const ds = join(DIR, '.DS_Store');
if (existsSync(ds)) rmSync(ds);

console.log('\nFinal images:');
for (const f of readdirSync(DIR).sort()) {
  console.log(' ', f);
}
