/*
 * FlowPlan — service worker v3.
 * Stratégie "network-first" pour le code (html/js/css/manifest) :
 *   -> une mise à jour (git pull + reload) est visible IMMÉDIATEMENT,
 *      le cache ne sert que si le serveur local est éteint (vrai hors-ligne).
 * Stratégie "cache-first" pour les images/icônes (statiques, immuables).
 */
const CACHE = 'flowplan-v3';
const CODE_ASSETS = [
  './', './index.html', './css/app.css',
  './js/parser.js', './js/planner.js', './js/store.js', './js/voice.js',
  './js/categories.js', './js/ics.js', './js/app.js', './manifest.webmanifest',
];
const STATIC_ASSETS = [
  './assets/icon.svg', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
];
const ALL_ASSETS = CODE_ASSETS.concat(STATIC_ASSETS);

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ALL_ASSETS); })
      .then(function () { return self.skipWaiting(); }) // prend le contrôle tout de suite
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); })); // purge les vieux caches (v1, v2)
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isCode(url) {
  return /\.(html|js|css|webmanifest)$/.test(new URL(url).pathname) || new URL(url).pathname.endsWith('/');
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (!url.startsWith(self.location.origin)) return; // rien d'externe, jamais

  if (isCode(url)) {
    // network-first : le code frais prime toujours
    event.respondWith(
      fetch(event.request)
        .then(function (resp) {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
          }
          return resp;
        })
        .catch(function () {
          return caches.match(event.request).then(function (hit) {
            return hit || caches.match('./index.html');
          });
        })
    );
  } else {
    // cache-first pour les assets statiques
    event.respondWith(
      caches.match(event.request).then(function (hit) {
        return hit || fetch(event.request).then(function (resp) {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
          }
          return resp;
        });
      })
    );
  }
});
