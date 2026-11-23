const CACHE = "indo-por-ai-v2-beta-6-30-101-journey-push";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=v2-beta-6-30-101",
  "app.js?v=v2-beta-6-30-101",
  "push-config.js?v=v2-beta-6-30-101",
  "data-service.js?v=v2-beta-6-30-101",
  "firebase-service.js?v=v2-beta-6-30-101",
  "admin.html",
  "admin.js?v=v2-beta-6-30-101",
  "admin.css",
  "manifest.webmanifest?v=63101",
  "pwa-install.js?v=v2-beta-6-30-101",
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

// Firebase Messaging uses the same existing PWA service worker registration.
// No push is requested automatically: the client must click "Ativar notificações".
try {
 importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js',
               'https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');
 firebase.initializeApp({apiKey:'AIzaSyD_EYtJ3h_WDvga2eV8LKEiCpDaT8gSEiM',authDomain:'indo-por-ai-app.firebaseapp.com',projectId:'indo-por-ai-app',messagingSenderId:'140345034738',appId:'1:140345034738:web:6b0dc70f830f56d45ecd6b'});
 firebase.messaging();
} catch(e) { console.warn('FCM em segundo plano não inicializado:',e); }
self.addEventListener('notificationclick', event=>{
 event.notification.close();
 const link=event.notification.data?.url||'/';
 const destination=new URL(link,self.location.origin);
 if(destination.origin!==self.location.origin)return;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(wins=>{
  for(const win of wins){if(win.url.startsWith(self.location.origin)){win.focus();return win.navigate(destination.href)}}
  return clients.openWindow(destination.href);
 }));
});
