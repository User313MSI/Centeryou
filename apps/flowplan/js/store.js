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

  const MAX_EVENTS = 5000;

  function isRealDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const parts = iso.split('-').map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  function isRealTime(t) {
    if (!/^\d{2}:\d{2}$/.test(t)) return false;
    const parts = t.split(':').map(Number);
    return parts[0] <= 23 && parts[1] <= 59;
  }

  function sanitizeEvent(e) {
    if (!e || typeof e !== 'object') return null;
    if (typeof e.id !== 'string' || !e.id) return null;
    if (typeof e.title !== 'string' || !e.title) return null;
    const out = {
      id: e.id.slice(0, 64),
      title: String(e.title).slice(0, 120),
      date: isRealDate(e.date || '') ? e.date : null,
      start: isRealTime(e.start || '') ? e.start : null,
      end: isRealTime(e.end || '') ? e.end : null,
      allDay: !!e.allDay,
      cat: typeof e.cat === 'string' ? e.cat.slice(0, 30) : null,
      color: /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : null,
      createdAt: typeof e.createdAt === 'string' ? e.createdAt.slice(0, 40) : new Date().toISOString(),
    };
    return out;
  }

  function load() {
    try {
      const raw = get();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.events)) return [];
      const seen = new Set();
      const out = [];
      for (const e of parsed.events) {
        const clean = sanitizeEvent(e);
        if (!clean || seen.has(clean.id)) continue;
        seen.add(clean.id);
        out.push(clean);
        if (out.length >= MAX_EVENTS) break;
      }
      return out;
    } catch (e) {
      return [];
    }
  }

  function clear() {
    if (storage) storage.removeItem(KEY);
    else delete mem[KEY];
  }

  return { save, load, clear, sanitizeEvent, MAX_EVENTS, KEY };
});
