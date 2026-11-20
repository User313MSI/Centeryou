/**
 * Service worker Centeryou — mode hors-ligne réel (aucun paquet, vanilla JS).
 * - install : précache la coquille (/, manifest, icônes) ;
 * - _next/static/* : cache d'abord (assets immuables hashés) ;
 * - navigations : réseau d'abord, sinon cache, sinon la coquille « / » ;
 *   l'app étant local-first (localStorage), elle fonctionne intégralement hors-ligne.
 */
const CACHE = 'centeryou-v1';

const SHELL = [
  '/',
  '/aujourdhui',
  '/planning',
  '/taches',
  '/voix',
  '/reglages',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});

/**
 * Clic sur une notification de rappel (M-04, rappels locaux uniquement) :
 * - clic simple : ouvre / ramène l'app sur la page Aujourd'hui et met l'événement en vedette
 *   (paramètre ?rappel=voir:<eventId> consommé par le moteur) ;
 * - bouton « Terminé » : ?rappel=fait:<clé> (plus jamais notifié pour cette occurrence) ;
 * - bouton « Reporter de 5 min » : ?rappel=reporter:<clé> (un seul rappel reprogrammé).
 * Le message postMessage doublonne la navigation pour les clients ouverts sur une autre page.
 */
self.addEventListener('notificationclick', (event) => {
  const notif = event.notification;
  notif.close();
  const data = notif.data || {};
  const action = event.action || '';
  let url = '/aujourdhui';
  if (action === 'done' && data.key) url = '/aujourdhui?rappel=fait:' + encodeURIComponent(data.key);
  else if (action === 'snooze' && data.key) url = '/aujourdhui?rappel=reporter:' + encodeURIComponent(data.key);
  else if (data.eventId) url = '/aujourdhui?rappel=voir:' + encodeURIComponent(data.eventId);
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (!client.url.startsWith(self.location.origin)) continue;
          // message de secours si la navigation client échoue (le moteur écoute aussi les messages)
          try {
            client.postMessage({ type: 'centeryou-rappel', action: action || 'voir', key: data.key || '', eventId: data.eventId || '' });
          } catch (e) {
            // ignore
          }
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
