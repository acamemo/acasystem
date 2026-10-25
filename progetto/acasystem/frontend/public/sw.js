// Minimal service worker for PWA installability
// Serves cached shell offline and caches immutable build assets at runtime.

const SHELL_CACHE_NAME = 'tunet-shell-v3';
const ASSET_CACHE_NAME = 'tunet-assets-v2';
// Casa 3D bundles (ADR-0014, D16): casa3d-<hash>.js and casa3d-<name>-<hash>.js under /casa3d/.
const CASA3D_CACHE_NAME = 'tunet-casa3d-v1';
const CASA3D_BUNDLE = /\/(casa3d(?:-[a-z0-9]+)?)-[0-9a-f]{12}\.js$/;
const SHELL_ASSETS = ['./', './index.html'];

function isBuildAssetRequest(request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  return url.origin === self.location.origin && url.pathname.includes('/assets/');
}

// Only a bundle with its content hash in the name is kept (the file never changes under that name).
// Everything else under /casa3d/ (manifest.json, lang/, notices) goes to the network: the manifest is the only way in
// to the current names, so an old copy of it would serve old versions.
function casa3dBundleStem(request) {
  if (request.method !== 'GET') return null;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.includes('/casa3d/')) return null;

  const match = CASA3D_BUNDLE.exec(url.pathname);
  return match ? match[1] : null;
}

// A new hash of a bundle replaces the old one in the cache, so versions never pile up and an old one is never served.
async function cacheCasa3dBundle(request, stem) {
  const cache = await caches.open(CASA3D_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter((key) => {
          const match = CASA3D_BUNDLE.exec(new URL(key.url).pathname);
          return match && match[1] === stem && key.url !== request.url;
        })
        .map((key) => cache.delete(key))
    );
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE_NAME, ASSET_CACHE_NAME, CASA3D_CACHE_NAME].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle navigation requests with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const casa3dStem = casa3dBundleStem(event.request);
  if (casa3dStem) {
    event.respondWith(cacheCasa3dBundle(event.request, casa3dStem));
    return;
  }

  if (isBuildAssetRequest(event.request)) {
    event.respondWith(cacheFirst(event.request, ASSET_CACHE_NAME));
  }
});
