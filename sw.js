const CACHE_NAME = 'sahu-hotel-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install - files cache karo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate - purana cache hatao
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Firebase API calls ko cache mat karo
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('firebaseapp.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request).then((response) => {
      // Success - cache mein bhi save karo
      if (response && response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // Network fail - cache se do
      return caches.match(event.request);
    })
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});