const CACHE = "indo-por-ai-v2-beta-6-30-14-email-icon";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-30-14",
  "app.js?v=v2-beta-6-30-14",
  "data-service.js?v=v2-beta-6-30-14",
  "firebase-service.js?v=v2-beta-6-30-14",
  "admin.html",
  "admin.js?v=v2-beta-6-30-14",
  "admin.css",
  "manifest.webmanifest?v=63011",
  "pwa-install.js?v=v2-beta-6-30-14",
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
  // Evita usar página HTML como se fosse áudio quando o host aplica fallback SPA.
  if(url.pathname.startsWith('/assets/trilha-')) {
    event.respondWith(fetch(event.request).then(res => {
      const type=(res.headers.get('content-type')||'').toLowerCase();
      return res.ok && (type.startsWith('audio/') || type.includes('octet-stream')) ? res : new Response('Áudio não publicado', {status:404});
    }).catch(()=>new Response('Áudio indisponível', {status:503})));
    return;
  }
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
