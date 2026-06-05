/**
 * Phonethagoras Service Worker
 *
 * Critical job: inject COOP + COEP headers on EVERY response.
 * SharedArrayBuffer (required for multi-threaded Wllama WASM) is
 * only available in a cross-origin isolated context. The server
 * sets these headers on Vercel, but on mobile browsers served from
 * a cache or a CDN without header control, the SW must re-inject them.
 *
 * Without these, Wllama falls back to single-threaded WASM — still works,
 * just slower. With them: full multi-core inference on the device.
 */

const CACHE_NAME = 'phonethagoras-v7';

// App shell — everything needed to run offline after first visit.
// The GGUF model files are NOT here — wllama manages its own HF cache.
const ASSETS = [
  './',
  './index.html',
  './models/professor.html',
  './models/nurse.html',
  './models/scout.html',
  './models/storyteller.html',
  './css/base.css',
  './assets/litrpg_bg.png',
  './assets/portal_sigil.png',
  './assets/sample_player_state.json',
  './assets/sigil.png',
  './assets/zz_lightning.png',
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
  './js/vault.js',
  './js/sync.js',
  './js/vaam.js',
  './js/vision-manager.js',
  './js/polarity.js',
  './js/quest.js',
  './js/voice.js',
  './js/wllama-engine.js',
  './js/kokoro-engine.js',
  './js/ai-core-widget.js',
  './js/rag-manager.js',
  './js/lfm-manager.js',
  './js/keystrokes.js',
  './js/sitrep-generator.js',
  './js/data/constants.js',
  './js/data/i18n.js'
];

// ── Install: pre-cache app shell ──────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ── Activate: delete old caches ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, inject COOP/COEP on every response ─────────
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin HuggingFace model downloads
  // (wllama manages its own cache for those)
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  // 1. Try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // Cache app-shell assets only (not HF models, CDN scripts, etc.)
      const url = new URL(request.url);
      if (url.origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return injectIsolationHeaders(networkResponse);
    }
    return networkResponse;
  } catch (_) {
    // 2. Network failed → serve from cache
    const cached = await caches.match(request);
    if (cached) return injectIsolationHeaders(cached);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Injects Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy
 * headers into any response, enabling SharedArrayBuffer (multi-threaded WASM).
 *
 * Uses CORP credentialless instead of require-corp so that CDN-loaded
 * WASM binaries (jsDelivr) and HuggingFace model chunks don't get blocked.
 */
function injectIsolationHeaders(response) {
  const headers = new Headers(response.headers);

  // Only inject if not already set (server headers take priority)
  if (!headers.has('Cross-Origin-Opener-Policy')) {
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  }
  if (!headers.has('Cross-Origin-Embedder-Policy')) {
    // credentialless: allows CDN subresources without CORP headers
    headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
