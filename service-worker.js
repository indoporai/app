const CACHE = "indo-por-ai-v2-beta-6-30-80-flags-web";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-30-80",
  "app.js?v=v2-beta-6-30-80",
  "data-service.js?v=v2-beta-6-30-80",
  "firebase-service.js?v=v2-beta-6-30-80",
  "admin.html",
  "admin.js?v=v2-beta-6-30-80",
  "admin.css",
  "manifest.webmanifest?v=63049",
  "pwa-install.js?v=v2-beta-6-30-80",
  "assets/apple-touch-icon-6347.png",
  "assets/icon-192-6347.png",
  "assets/icon-512-6347.png",
  "assets/logo-oficial-cliente.png",
  "assets/icon-maskable-512-6347.png",
  "assets/postcard-sao-paulo-6347.webp",
  "assets/flags/pt.svg",
  "assets/flags/ie.svg",
  "assets/flags/nl.svg",
  "assets/flags/lu.svg",
  "assets/flags/gb-eng.svg",
  "assets/flags/gb.svg",
  "assets/flags/br.svg",
  "assets/flags/es.svg",
  "assets/flags/fr.svg",
  "assets/flags/it.svg",
  "assets/flags/de.svg",
  "assets/flags/be.svg",
  "assets/flags/ch.svg",
  "assets/flags/at.svg",
  "assets/flags/ma.svg",
  "assets/flags/va.svg",
  "assets/flags/us.svg",
  "assets/flags/ca.svg",
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
