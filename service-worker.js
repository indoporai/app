const CACHE = "indo-por-ai-v2-beta-6-30-47-budget-edit";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-30-47",
  "app.js?v=v2-beta-6-30-47",
  "data-service.js?v=v2-beta-6-30-47",
  "firebase-service.js?v=v2-beta-6-30-47",
  "admin.html",
  "admin.js?v=v2-beta-6-30-47",
  "admin.css",
  "manifest.webmanifest?v=63047",
  "pwa-install.js?v=v2-beta-6-30-47",
  "assets/apple-touch-icon-6347.png",
  "assets/icon-192-6347.png",
  "assets/icon-512-6347.png",
  "assets/logo-oficial-cliente.png",
  "assets/icon-maskable-512-6347.png",
  "assets/postcard-sao-paulo-6347.webp",
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
  const critical = url.origin === self.location.origin && (url.pathname === "/" || url.pathname.endsWith("/") || /\.(?:html|js|css)$/.test(url.pathname) || /\.(?:webmanifest)$/.test(url.pathname) || /\/assets\/(?:icon-|apple-touch-icon|favicon|postcard-)/.test(url.pathname));
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
