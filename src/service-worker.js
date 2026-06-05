const CACHE_NAME = 'phonethagoras-v3';
const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/views.css',
  './css/utilities.css',
  './js/app.js',
  './js/ai.js',
  './js/breath.js',
  './js/bridge.js',
  './js/chat.js',
  './js/dashboard.js',
  './js/docs.js',
  './js/hardware.js',
  './js/i18n.js',
  './js/onboarding.js',
  './js/pearl.js',
  './js/radar.js',
  './js/recycle.js',
  './js/settings.js',
  './js/state.js',
  './js/sync.js',
  './js/vaam.js',
  './js/polarity.js',
  './js/quest.js',
  './js/voice.js',
  './js/webllm-manager.js',
  './js/data/constants.js',
  './js/data/i18n.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first strategy for development to avoid stale caches
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache if network succeeds
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
