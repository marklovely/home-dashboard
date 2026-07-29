const CACHE_NAME = 'home-dashboard-v1.0.6';

/** @type {string[]} */
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

/**
 * @param {Request} request
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, copy);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Offline');
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.hostname.includes('virtualbuttons.com')) return;

  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
    )
  );
});
