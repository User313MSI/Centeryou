/* FlowPlan — service worker : app 100 % hors-ligne dès la 2e visite. */
const CACHE = 'flowplan-v2';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/parser.js',
  './js/planner.js',
  './js/store.js',
  './js/voice.js',
  './js/categories.js',
  './js/ics.js',
  './js/app.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      return hit || fetch(event.request).then(function (resp) {
        if (resp && resp.ok && new URL(event.request.url).origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
