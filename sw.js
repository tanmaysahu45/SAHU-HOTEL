const CACHE_NAME = 'sahu-kirana-v1';
const ASSETS = [
  '/SAHU-HOTEL/',
  '/SAHU-HOTEL/index.html',
  '/SAHU-HOTEL/manifest.json',
  '/SAHU-HOTEL/script.js',
  '/SAHU-HOTEL/4c788179-bf9a-4776-8165-35933ee9efd5.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});