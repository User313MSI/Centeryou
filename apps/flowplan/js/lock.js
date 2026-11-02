/*
 * FlowPlan — Vault : verrouillage par PIN + chiffrement AES-GCM du stockage.
 * WebCrypto (disponible navigateur ET Node >= 20) : PBKDF2 (SHA-256, 100k itérations)
 * pour dériver la clé du PIN, puis AES-GCM 256 bits. Zéro dépendance.
 * En Node (tests), crypto.subtle est global.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanVault = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const subtle = (typeof crypto !== 'undefined' && crypto.subtle) || (globalThis.crypto && globalThis.crypto.subtle);
  const ITERATIONS = 100000;
  const KEY = 'flowplan.vault.v1';

  function b64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(s) {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function deriveKey(pin, salt, extractable) {
    const enc = new TextEncoder();
    const baseKey = await subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      !!extractable, // non extractible par défaut : la clé ne sort jamais de WebCrypto
      ['encrypt', 'decrypt']
    );
  }

  // empreinte du PIN = AES-GCM d'un texte fixe avec la clé dérivée, puis hash de la sortie
  async function hashPin(pin, salt) {
    const key = await deriveKey(pin, salt, true);
    const enc = new TextEncoder();
    const fixed = enc.encode('flowplan-pin-check');
    const iv = new Uint8Array(12); // IV fixe connu : on veut un hash déterministe, pas du chiffrement
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, fixed);
    const digest = await subtle.digest('SHA-256', ct);
    return b64(digest);
  }

  function getMeta(storage) {
    try {
      const raw = storage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function isEnabled(storage) {
    return !!getMeta(storage);
  }

  // active le verrou : calcule le hash du PIN et le stocke (le hash seul, jamais le PIN)
  async function enable(pin, storage) {
    if (!subtle) throw new Error('WebCrypto indisponible');
    if (!pin || String(pin).length < 4) throw new Error('Le code doit faire au moins 4 caractères');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPin(pin, salt.buffer);
    storage.setItem(KEY, JSON.stringify({ v: 1, salt: b64(salt.buffer), hash: hash, iter: ITERATIONS }));
    return true;
  }

  // vérifie le PIN ; si OK, garde la clé dérivée en mémoire (jamais écrite)
  async function unlock(pin, storage) {
    const meta = getMeta(storage);
    if (!meta) return { ok: false, reason: 'not-enabled' };
    const salt = unb64(meta.salt);
    const hash = await hashPin(pin, salt);
    if (hash !== meta.hash) return { ok: false, reason: 'bad-pin' };
    const key = await deriveKey(pin, salt);
    return { ok: true, key: key };
  }

  function disable(storage) {
    storage.removeItem(KEY);
  }

  async function encrypt(text, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(text));
    return JSON.stringify({ iv: b64(iv.buffer), data: b64(ct) });
  }

  async function decrypt(payload, key) {
    const obj = JSON.parse(payload);
    const dec = await subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(unb64(obj.iv)) }, key, unb64(obj.data));
    return new TextDecoder().decode(dec);
  }

  return { isEnabled, enable, unlock, disable, encrypt, decrypt, hashPin, KEY, ITERATIONS };
});
