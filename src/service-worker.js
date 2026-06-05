const CACHE_NAME = 'phonethagoras-v1';
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
  './js/state.js',
  './js/sync.js',
  './js/vaam.js',
  './js/voice.js',
  './js/webllm-manager.js',
  './js/data/constants.js',
  './js/data/i18n.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
