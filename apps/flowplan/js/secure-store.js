/*
 * FlowPlan — SecureStore : wrappe Store avec chiffrement AES-GCM quand le vault est actif.
 * Si le verrou est OFF : stockage en clair (comportement actuel).
 * Si ON : events chiffrés sous flowplan.events.enc.v1 ; la clé reste en mémoire (jamais écrite).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanSecureStore = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const ENC_KEY = 'flowplan.events.enc.v1';

  function create(Store, Vault, storage) {
    let key = null; // CryptoKey en mémoire, présente seulement si déverrouillé

    function isLocked() { return Vault.isEnabled(storage) && !key; }

    async function unlock(pin) {
      const r = await Vault.unlock(pin, storage);
      if (r.ok) key = r.key;
      return r.ok;
    }

    function lock() { key = null; }

    async function save(events) {
      if (Vault.isEnabled(storage) && key) {
        const ct = await Vault.encrypt(JSON.stringify({ version: 1, savedAt: new Date().toISOString(), events: events }), key);
        storage.setItem(ENC_KEY, ct);
        storage.removeItem(Store.KEY); // migre : on retire l'ancien clair
        return true;
      }
      return Store.save(events);
    }

    async function load() {
      if (Vault.isEnabled(storage)) {
        if (!key) return []; // verrouillé : rien à lire
        const raw = storage.getItem(ENC_KEY);
        if (!raw) return [];
        try {
          const dec = await Vault.decrypt(raw, key);
          const parsed = JSON.parse(dec);
          return Array.isArray(parsed.events) ? parsed.events : [];
        } catch (e) { return []; }
      }
      return Store.load();
    }

    function clear() {
      storage.removeItem(ENC_KEY);
      Store.clear();
      key = null;
    }

    return { save, load, clear, unlock, lock, isLocked, isVaultEnabled: () => Vault.isEnabled(storage) };
  }

  return { create, ENC_KEY };
});
