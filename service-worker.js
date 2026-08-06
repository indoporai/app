
const CACHE = "indo-por-ai-modelo-ideal-completo-v9";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=logo-final-4",
  "app.js?v=logo-final-4",
  "manifest.webmanifest",
  "assets/apple-touch-icon.png",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const isCore = url.pathname.endsWith("index.html") ||
                 url.pathname.endsWith("app.js") ||
                 url.pathname.endsWith("styles.css") ||
                 url.pathname === "/" ||
                 url.pathname.endsWith("/");

  if (isCore) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
