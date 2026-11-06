/*
 * FlowPlan — boot : enregistre le service worker.
 * ?fresh=1 : purge tous les SW + caches une fois, puis recharge l'URL propre.
 * ?nosw=1   : mode développement — AUCUN service worker, aucun cache.
 *             Chaque rechargement sert le code frais du serveur, garanti.
 *             À utiliser pendant les itérations : http://localhost:8000/?nosw=1
 */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('nosw')) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        rs.forEach(function (r) { r.unregister(); });
      });
    }
    return; // on ne enregistre rien
  }
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
  // v8: plus de cache SW par défaut. On enregistre UNIQUEMENT si ?sw=1 (déploiement web seulement).
  if (params.get('sw') === '1' && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }
})();
