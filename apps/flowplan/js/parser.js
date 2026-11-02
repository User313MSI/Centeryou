/*
 * FlowPlan — parser de phrases en français vers des événements structurés.
 * Zéro dépendance. Fonctionne dans le navigateur (window.FlowPlanParser)
 * et dans Node (module.exports) pour les tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanParser = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const DAYS = {
    lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0,
    lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 0,
  };
  const MONTHS = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
    janv: 0, fevr: 1, avr: 3, juil: 6, sept: 8, oct: 9, nov: 10, dec: 11,
  };

  // chaîne sans accents, minuscule — utilisée UNIQUEMENT pour la détection
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // chaîne minuscule AVEC accents — utilisée pour construire le titre
  function displayLower(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[’']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function toISODate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayISO(now) {
    return toISODate(now || new Date());
  }

  function nextDayOfWeek(target, now) {
    const n = now || new Date();
    const cur = n.getDay(); // 0=dimanche
    let diff = (target - cur + 7) % 7;
    if (diff === 0) diff = 7; // "lundi" dit un lundi = la semaine prochaine
    return toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + diff));
  }

  // "14h30", "14h", "9h", "14:30"
  function parseTimeToken(tok) {
    const m = String(tok).match(/^(\d{1,2})[h:](\d{2})$/);
    if (m) return { h: +m[1], m: +m[2] };
    const m2 = String(tok).match(/^(\d{1,2})h$/);
    if (m2) return { h: +m2[1], m: 0 };
    return null;
  }

  function validTime(t) {
    return !!t && t.h >= 0 && t.h <= 23 && t.m >= 0 && t.m <= 59;
  }

  const DAY_RE = new RegExp('\\b(' + Object.keys(DAYS).join('|') + ')s?\\b');

  // rend un motif littéral tolérant aux accents (a -> [aà], e -> [eéèêë]…)
  function accentFlexible(src) {
    return String(src)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/a/g, '[aà]').replace(/e/g, '[eéèêë]').replace(/i/g, '[iîï]')
      .replace(/o/g, '[oôö]').replace(/u/g, '[uùûü]').replace(/c/g, '[cç]');
  }

  /*
   * parseEvent(phrase, now?) -> { date, start, end, title, allDay, recurrence? } ou null
   * date au format ISO "YYYY-MM-DD" (absente si aucune date trouvée)
   */
  function parseEvent(phrase, now) {
    const raw = String(phrase || '').trim();
    if (!raw) return null;
    let text = normalize(raw);          // détection (sans accents)
    let disp = displayLower(raw);       // titre (avec accents)
    if (text.length > 300) { text = text.slice(0, 300); disp = disp.slice(0, 300); }

    // retire un motif des deux chaînes : sans accents (text) et avec accents (disp)
    function strip(matchStr) {
      const re = new RegExp(matchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      text = text.replace(re, ' ');
      const reDisp = new RegExp(accentFlexible(matchStr), 'giu');
      disp = disp.replace(reDisp, ' ');
    }

    let date;
    let allDay = false;
    let recurrence = null;

    if (/\baujourd ?hui\b/.test(text)) { date = todayISO(now); strip('aujourd hui'); }
    if (/\bdemain\b/.test(text)) {
      const n = now || new Date();
      date = toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1));
      strip('demain');
    }

    if (/\btous les jours\b/.test(text)) { recurrence = 'daily'; strip('tous les jours'); }
    // une récurrence quotidienne sans date précise démarre aujourd'hui
    if (recurrence === 'daily' && !date) date = todayISO(now);

    // "12 mai 2026", "le 1er mars"
    let m = text.match(/\b(?:le\s+)?(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|janv|fevr|avr|juil|sept|oct|nov|dec)\.?\s*(\d{4})?\b/);
    if (m && !date) {
      const n = now || new Date();
      const year = m[3] ? +m[3] : n.getFullYear();
      date = toISODate(new Date(year, MONTHS[normalize(m[2])], +m[1]));
      strip(m[0]);
    }
    // "12/05/2026" ou "12/05"
    m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    if (m && !date) {
      const n = now || new Date();
      const year = m[3] ? +m[3] : n.getFullYear();
      date = toISODate(new Date(year, +m[2] - 1, +m[1]));
      strip(m[0]);
    }

    // jour de semaine (avec pluriel "lundis")
    const dayMatch = text.match(DAY_RE);
    if (dayMatch) {
      if (!recurrence && /\b(tous les|toutes les|chaque)\b/.test(text)) {
        recurrence = 'weekly';
        strip('tous les'); strip('toutes les'); strip('chaque');
      }
      if (!date) date = nextDayOfWeek(DAYS[dayMatch[1]], now);
      strip(dayMatch[0]);
    }

    // plage horaire "18h à 20h" / "18h-20h" / "18h jusqu'à 20h"
    let start = null, end = null;
    const range = text.match(/\b(\d{1,2}[h:]\d{2}|\d{1,2}h)\s*(?:a|à|jusqu ?a|jusqu ?au|-|–|—)\s*(\d{1,2}[h:]\d{2}|\d{1,2}h)\b/);
    if (range) {
      const t1 = parseTimeToken(range[1]);
      const t2 = parseTimeToken(range[2]);
      if (validTime(t1)) start = t1;
      if (validTime(t2)) end = t2;
      strip(range[0]);
    } else {
      const single = text.match(/\b(\d{1,2}[h:]\d{2}|\d{1,2}h)\b/);
      if (single) {
        const t = parseTimeToken(single[1]);
        if (validTime(t)) { start = t; strip(single[0]); }
      }
    }

    // durée explicite "pendant 2h" / "2h" après l'heure de début ; sinon durée implicite 1h
    if (start && !end) {
      const dur = text.match(/\bpendant\s+(\d{1,2})\s*(h|heures?|min|minutes?)\b/) || text.match(/\b(\d{1,2})\s*(h|heures?|min|minutes?)\b/);
      if (dur) {
        const val = +dur[1];
        const minutes = dur[2].startsWith('h') ? val * 60 : val;
        const total = start.h * 60 + start.m + minutes;
        end = { h: Math.floor(total / 60) % 24, m: total % 60 };
        strip(dur[0]);
      } else {
        const total = start.h * 60 + start.m + 60;
        end = { h: Math.floor(total / 60) % 24, m: total % 60 };
      }
    }

    if (!start) allDay = true;

    // titre : nettoyage de la version AVEC accents.
    // On découpe en mots et on retire les mots-liens UNIQUEMENT en tête de phrase
    // (sinon "Léa" perdrait son "a" final à cause des limites de mots Unicode).
    const LINK_WORDS = new Set(['le', 'la', 'les', 'du', 'de', 'des', 'au', 'aux', 'a', 'à', 'en', 'et', 'avec', 'pour', 'par', 'vers', "jusqu'au", 'jusquau']);
    let words = disp.replace(/\b\d{1,2}[h:]\d{2}\b|\b\d{1,2}h\b/gu, ' ').split(/\s+/).filter(Boolean);
    while (words.length && LINK_WORDS.has(words[0].toLowerCase().replace(/[.,;:!?]$/, ''))) words.shift();
    let title = words.join(' ').trim();
    if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
    if (!title) title = 'Événement';

    const ev = { title, allDay };
    if (date) ev.date = date;
    if (start) ev.start = pad2(start.h) + ':' + pad2(start.m);
    if (end) ev.end = pad2(end.h) + ':' + pad2(end.m);
    if (recurrence) ev.recurrence = recurrence;
    return ev;
  }

  /*
   * expandRecurring(ev, horizonWeeks?) -> occurrences concrètes
   * "weekly" sur N+1 semaines, "daily" sur 15 jours.
   */
  function expandRecurring(ev, horizonWeeks) {
    if (!ev || !ev.recurrence || !ev.date) return ev ? [ev] : [];
    const weeks = horizonWeeks || 8;
    const out = [];
    const base = new Date(ev.date + 'T12:00:00');
    const n = ev.recurrence === 'daily' ? 14 : weeks;
    for (let i = 0; i <= n; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + (ev.recurrence === 'daily' ? i : i * 7));
      const occ = Object.assign({}, ev, { date: toISODate(d) });
      delete occ.recurrence;
      out.push(occ);
    }
    return out;
  }

  /*
   * parse(phrase, now?, expand?) -> tableau d'événements
   * Séparateurs : point-virgule, retour à la ligne, "puis", "ensuite".
   * Les récurrences sont étendues automatiquement sauf si expand === false.
   */
  function parse(phrase, now, expand) {
    const parts = String(phrase || '')
      .split(/[;\n]+|\s+puis\s+|\s+ensuite\s+/i)
      .map(s => s.trim())
      .filter(Boolean);
    const events = [];
    for (const p of parts) {
      const ev = parseEvent(p, now);
      if (!ev) continue;
      if (expand !== false && ev.recurrence) events.push(...expandRecurring(ev));
      else events.push(ev);
    }
    return events;
  }

  return { parse, parseEvent, expandRecurring, normalize, todayISO, nextDayOfWeek };
});
