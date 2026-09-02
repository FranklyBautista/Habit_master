// Minimal, hand-written service worker for Constancia.
//
// Strategy (deliberately simple and auditable, no third-party PWA library):
// - Never intercepts non-GET requests or cross-origin requests (Supabase),
//   so authenticated mutations and API responses always hit the network.
// - Page navigations are network-first; only the static, unauthenticated
//   `/offline` page is served from cache, and only when the network fails.
// - Hashed Next.js build assets and public icons are cache-first: they are
//   either content-addressed or contain no user data, so reuse is safe.
//
// Bump CACHE_VERSION on deploys that change the precached files so old
// caches are dropped on activate (see docs/deploy/CHECKLIST.md).
const CACHE_VERSION = "v1";
const STATIC_CACHE = `constancia-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/favicon.ico", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico";
  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
