/*
 * FlowPlan — boot : enregistre le service worker.
 * Kill switch : ouvrir http://localhost:8000/?fresh=1 UNE fois purge tous les
 * service workers et tous les caches, puis recharge l'URL propre.
 * (indispensable après un git pull quand un ancien SW sert encore l'ancien code)
 */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('fresh')) {
    var done = function () { location.replace(location.pathname); };
    var p = Promise.resolve();
    if ('serviceWorker' in navigator) {
      p = p.then(function () {
        return navigator.serviceWorker.getRegistrations().then(function (rs) {
          rs.forEach(function (r) { r.unregister(); });
        });
      });
    }
    if ('caches' in window) {
      p = p.then(function () {
        return caches.keys().then(function (keys) {
          keys.forEach(function (k) { caches.delete(k); });
        });
      });
    }
    p.then(done, done);
    return;
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }
})();
