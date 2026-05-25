/**
 * Injects PWA wiring into the Expo web build's index.html.
 *
 * Expo's `web.output: "single"` ignores app/+html.tsx, so we add the manifest
 * link, theme colour (DESIGN.md dark base), iOS standalone meta tags, and the
 * service-worker registration here, after `expo export`. Idempotent.
 *
 * Run via `npm run build:web` (export then this script).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, '..', 'dist', 'index.html');

let html = readFileSync(indexPath, 'utf8');

const MARKER = '<!-- pwa:head -->';
if (html.includes(MARKER)) {
  console.log('pwa-postbuild: already injected, skipping.');
  process.exit(0);
}

const HEAD = `${MARKER}
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0E0F12" />
    <meta name="description" content="A dating and community app for Arsenal supporters worldwide — an independent fan project, not affiliated with Arsenal Football Club." />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Arsenal Dating" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
  `;

// Inject just before </head>.
if (!html.includes('</head>')) {
  throw new Error('pwa-postbuild: no </head> found in dist/index.html');
}
html = html.replace('</head>', `${HEAD}</head>`);

// Tidy the document title and let the standalone app draw under the notch.
html = html.replace(/<title>[^<]*<\/title>/, '<title>Arsenal Dating</title>');
html = html.replace(
  'content="width=device-width, initial-scale=1, shrink-to-fit=no"',
  'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"',
);

writeFileSync(indexPath, html);
console.log('pwa-postbuild: injected PWA head tags + service-worker registration into dist/index.html');
