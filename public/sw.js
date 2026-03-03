const CACHE_NAME = 'saldobirras-v5';
const OFFLINE_URL = '/offline.html';

// Assets that are safe to precache (static files only, never pages that may redirect)
const PRECACHE_ASSETS = [
  '/logo.png',
  '/fondo.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/manifest-portal.json',
  OFFLINE_URL,
];

// Install: cache static assets (resilient — don't fail on individual errors)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('[SW] Failed to precache:', url, err)
          )
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy per request type
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests (Supabase, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internal requests that shouldn't be cached
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // API calls: network-only with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ success: false, error: 'Sin conexión a internet' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );
    return;
  }

  // Navigation requests: network-first with offline page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets (_next/static, images, fonts): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
