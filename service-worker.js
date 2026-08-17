const CACHE = "indo-por-ai-v2-beta-6-5-2-2-1";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-5-2",
  "app.js?v=v2-beta-6-5-2",
  "data-service.js?v=v2-beta-6-5-2",
  "firebase-service.js?v=v2-beta-6-5-2",
  "firebase-service.js?v=v2-beta-5",
  "admin.html",
  "admin.js",
  "admin.css",
  "manifest.webmanifest",
  "assets/apple-touch-icon.png",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const core = url.pathname === "/" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html") || url.pathname.endsWith("app.js") || url.pathname.endsWith("styles.css") || url.pathname.endsWith("service-worker.js");
  if(core){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
