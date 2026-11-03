/*
 * FlowPlan — saisie vocale via l'API Web Speech (SpeechRecognition).
 * Uniquement dans le navigateur ; exposé proprement si absent.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanVoice = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function isSupported() {
    return typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /*
   * start({ lang, onResult, onEnd, onError }) -> objet { stop() }
   * onResult reçoit le texte reconnu (final).
   */
  function start(opts) {
    opts = opts || {};
    const Ctor = typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!Ctor) {
      if (opts.onError) opts.onError(new Error('Reconnaissance vocale non disponible sur ce navigateur.'));
      return { stop: function () {} };
    }
    const rec = new Ctor();
    rec.lang = opts.lang || 'fr-FR';
    rec.interimResults = true; // POINT 2: affichage live de la reconnaissance
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let stopped = false;
    rec.onresult = function (event) {
      const res = event.results[event.results.length - 1];
      if (res && res.isFinal && opts.onResult) opts.onResult(res[0].transcript);
      else if (res && opts.onInterim) opts.onInterim(res[0].transcript); // live
    };
    rec.onerror = function (event) {
      if (opts.onError) opts.onError(new Error(event.error || 'Erreur vocale'));
    };
    rec.onend = function () {
      if (!stopped && opts.onEnd) opts.onEnd();
    };
    try { rec.start(); } catch (e) {
      if (opts.onError) opts.onError(e);
    }
    return {
      stop: function () {
        stopped = true;
        try { rec.stop(); } catch (e) { /* déjà arrêté */ }
      },
    };
  }

  return { isSupported, start };
});
