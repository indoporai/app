const CACHE = "indo-por-ai-v2-beta-6-30-09-email-icon";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-30-09",
  "app.js?v=v2-beta-6-30-09",
  "data-service.js?v=v2-beta-6-30-09",
  "firebase-service.js?v=v2-beta-6-30-09",
  "admin.html",
  "admin.js?v=v2-beta-6-30-09",
  "admin.css",
  "manifest.webmanifest?v=63009",
  "pwa-install.js?v=v2-beta-6-30-09",
  "assets/apple-touch-icon.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/trilha-emocionante.m4a",
  "assets/trilha-emocionante.mp3",
  "assets/trilha-leve.m4a",
  "assets/trilha-leve.mp3",
  "assets/trilha-animada.m4a",
  "assets/trilha-animada.mp3"
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
