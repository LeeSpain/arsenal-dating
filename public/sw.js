/* Arsenal Dating service worker.
 * Goal: satisfy installable-PWA criteria and load reliably (offline shell),
 * WITHOUT ever caching the Supabase API (it's a different origin, so the fetch
 * handler ignores cross-origin requests entirely). Bump CACHE to ship updates.
 */
const CACHE = 'arsenal-dating-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Don't fail the whole install if one optional asset 404s.
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only ever touch our own origin — never Supabase or any other API.
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first so the app stays fresh; fall back to the
  // cached shell when offline so deep links still open.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets (content-hashed JS/CSS, icons): cache-first, then populate.
  const cacheable =
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/');

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            if (cacheable && response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached),
    ),
  );
});
