/* Service worker — offline play.

   Hand-rolled rather than pulled from a plugin: the whole app is a handful of static
   files, so the logic is twenty lines and avoids a build dependency that would need
   maintaining.

   Strategy: cache-first for the shell (instant repeat loads, works on a plane),
   network-first for navigation so a deploy is picked up rather than pinned forever.
   The cache name carries a version — bump it to force every client to refresh. */
/* Replaced at build time (see stampServiceWorker in vite.config.js) with a hash
   of the entry bundle, so the name changes exactly when the code does. The
   literal below is the DEV value: in `vite dev` the worker is never registered,
   and if this file is ever served unstamped the name is still valid — it just
   stops changing, which the build warns about. */
const VERSION = 'squiggle-__BUILD__';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Drop every older cache, or a user who has visited before is stuck on old code.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Navigations: try the network so deploys land, fall back to cache when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(request, copy)); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed assets never change under the same name, so cache-first is safe and fast.
  e.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(res => {
      if (res.ok && new URL(request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
