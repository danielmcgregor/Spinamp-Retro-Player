const CACHE_NAME = 'spinamp-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/spinamp_logo.jpg',
  '/spinamp_logo_192.png',
  '/spinamp_logo_512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Failed to pre-cache assets, skipping pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let the browser fetch normally; fallback to cache if offline
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      // Navigation requests can still open the app shell while offline.
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('/index.html');
        if (shell) return shell;
      }

      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
