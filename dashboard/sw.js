/* Tevel Tribe Engine — offline shell + data cache */
const CACHE = "tevel-pwa-v4";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./themes.css",
  "./graph-palettes.css",
  "./app.js",
  "./charts.js",
  "./graphics.js",
  "./metrics-normalize.js",
  "./radar.js",
  "./themes.js",
  "./session-tribes.js",
  "./tribe-create.js",
  "./tribe-edit.js",
  "./data.json",
  "./generated-data.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/**
 * HTML navigations: network-first, cache fallback (so updates land when online).
 * Same-origin assets / data / scripts: stale-while-revalidate.
 * Cross-origin (fonts): cache-first after first fetch.
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.origin === self.location.origin) {
    const path = url.pathname;
    if (path.endsWith(".js") || path.endsWith(".css")) {
      event.respondWith(networkFirst(req));
      return;
    }
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached =
      (await cache.match(req)) ||
      (await cache.match("./index.html")) ||
      (await cache.match("./"));
    if (cached) return cached;
    return new Response("Offline — open Tevel once online to cache the app.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return Response.error();
  }
}
