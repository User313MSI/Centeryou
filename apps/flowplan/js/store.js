/*
 * FlowPlan — persistance locale (localStorage dans le navigateur/PWA/Electron,
 * mémoire en Node pour les tests). Zéro dépendance.
 */
(function (root, factory) {
  const api = factory(typeof localStorage !== 'undefined' ? localStorage : null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanStore = api;
})(typeof self !== 'undefined' ? self : globalThis, function (storage) {
  'use strict';

  const KEY = 'flowplan.events.v1';
  const mem = {};

  function get() {
    if (storage) return storage.getItem(KEY);
    return mem[KEY] || null;
  }
  function set(v) {
    if (storage) storage.setItem(KEY, v);
    else mem[KEY] = v;
  }

  function save(events) {
    const payload = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), events });
    try {
      set(payload);
      return true;
    } catch (e) {
      // quota dépassé (localStorage ~5 Mo) : on tente un nettoyage puis on réessaie
      try { clear(); set(payload); return true; } catch (e2) { return false; }
    }
  }

  function load() {
    try {
      const raw = get();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.events)) return [];
      // filtre défensif : chaque événement doit avoir id + titre
      return parsed.events.filter(e =>
        e && typeof e === 'object' && typeof e.id === 'string' && typeof e.title === 'string');
    } catch (e) {
      return [];
    }
  }

  function clear() {
    if (storage) storage.removeItem(KEY);
    else delete mem[KEY];
  }

  return { save, load, clear, KEY, QUOTA_ERROR: 'QUOTA' };
});
