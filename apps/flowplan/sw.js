/*
 * FlowPlan — service worker v3.
 * Stratégie "network-first" pour le code (html/js/css/manifest) :
 *   -> une mise à jour (git pull + reload) est visible IMMÉDIATEMENT,
 *      le cache ne sert que si le serveur local est éteint (vrai hors-ligne).
 * Stratégie "cache-first" pour les images/icônes (statiques, immuables).
 */
const CACHE = 'flowplan-v8-nocache';
const CODE_ASSETS = [
  './', './index.html', './css/app.css',
  './js/parser.js', './js/planner.js', './js/store.js', './js/voice.js',
  './js/categories.js', './js/ics.js', './js/ics-import.js', './js/csv-import.js', './js/brain.js', './js/lock.js', './js/secure-store.js', './js/app.js', './js/boot.js', './manifest.webmanifest',
];
const STATIC_ASSETS = [
  './assets/icon.svg', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
];
const ALL_ASSETS = CODE_ASSETS.concat(STATIC_ASSETS);

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.skipWaiting(); })
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
  // v8: AUCUN cache — toujours le réseau. Hors-ligne: page hors-ligne minimaliste.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response('<!DOCTYPE html><meta charset="utf-8"><body style="font-family:sans-serif;background:#191a1a;color:#eee;display:grid;place-items:center;height:100vh"><div><h1>FlowPlan hors-ligne</h1><p>Reconnecte-toi ou relance en local (fichier index.html).</p></div></body>', { headers: { 'Content-Type': 'text/html' } });
      })
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
