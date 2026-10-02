const CACHE = "indo-por-ai-v2-beta-6-29-17-login-live-weather";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-29-17",
  "app.js?v=v2-beta-6-29-17",
  "data-service.js?v=v2-beta-6-29-17",
  "firebase-service.js?v=v2-beta-6-29-17",
  "admin.html",
  "admin.js?v=v2-beta-6-29-17",
  "admin.css",
  "manifest.webmanifest",
  "pwa-install.js?v=v2-beta-6-29-17",
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
  const critical = url.origin === self.location.origin && (url.pathname === "/" || url.pathname.endsWith("/") || /\.(?:html|js|css)$/.test(url.pathname));
  if(critical){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
