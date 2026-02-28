const CACHE_NAME = 'pwa-registrar-v2';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js'
];

// ====== Install ======
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
        } catch (err) {
          console.warn(`Не удалось закешировать ${file}: ${err}`);
        }
      }
    })
  );
  self.skipWaiting();
});

// ====== Activate ======
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ====== Fetch ======
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => response || fetch(evt.request))
  );
});

