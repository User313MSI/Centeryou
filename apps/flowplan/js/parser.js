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

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

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

  // valide une vraie date calendaire (rejette 32 janvier, 12/13/2026, 29 février 2026…)
  function isValidDate(y, m, d) {
    if (m < 0 || m > 11 || d < 1 || d > 31) return false;
    const dt = new Date(y, m, d);
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
  }

  function todayISO(now) {
    return toISODate(now || new Date());
  }

  function nextDayOfWeek(target, now) {
    const n = now || new Date();
    const cur = n.getDay();
    const diff = (target - cur + 7) % 7; // 0 = aujourd'hui (le jour même reste valable)
    return toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + diff));
  }

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

  function fmtTime(t) { return pad2(t.h) + ':' + pad2(t.m); }

  // distance de Levenshtein simple (pour rattraper les fautes de frappe sur les jours)
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  // trouve un jour de semaine même avec une faute de frappe (distance <= 1)
  function matchDayWord(word) {
    const w = word.replace(/s$/, '');
    if (DAYS[w] !== undefined) return DAYS[w];
    let best = null, bestDist = 2;
    for (const d of Object.keys(DAYS)) {
      const dist = levenshtein(w, d);
      if (dist < bestDist) { bestDist = dist; best = DAYS[d]; }
    }
    return best;
  }

  const DAY_RE = new RegExp('\\b(' + Object.keys(DAYS).join('|') + ')s?\\b');

  function accentFlexible(src) {
    return String(src)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/a/g, '[aà]').replace(/e/g, '[eéèêë]').replace(/i/g, '[iîï]')
      .replace(/o/g, '[oôö]').replace(/u/g, '[uùûü]').replace(/c/g, '[cç]');
  }

  /*
   * parseEvent(phrase, now?) -> { date, start, end, title, allDay, recurrence? } ou null
   */
  function parseEvent(phrase, now) {
    const raw = String(phrase || '').trim();
    if (!raw) return null;
    let text = normalize(raw);
    let disp = displayLower(raw);
    if (text.length > 300) { text = text.slice(0, 300); disp = disp.slice(0, 300); }

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
    if (/\bce soir\b/.test(text)) { if (!date) date = todayISO(now); strip('ce soir'); }
    if (/\bdemain\b/.test(text)) {
      const n = now || new Date();
      date = toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1));
      strip('demain');
    }
    // "dans 3 jours"
    let m = text.match(/\bdans\s+(\d{1,7})\s+jours?\b/);
    if (m && !date) {
      const n = now || new Date();
      date = toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + Math.min(+m[1], 365)));
      strip(m[0]);
    }
    // "dans une semaine"
    m = text.match(/\bdans\s+une?\s+semaine\b/);
    if (m && !date) {
      const n = now || new Date();
      date = toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 7));
      strip(m[0]);
    }

    // récurrence quotidienne
    if (/\btous les jours\b/.test(text)) { recurrence = 'daily'; strip('tous les jours'); }
    if (recurrence === 'daily' && !date) date = todayISO(now);

    // "12 mai 2026", "le 1er mars" — avec validation calendaire
    m = text.match(/\b(?:le\s+)?(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|janv|fevr|avr|juil|sept|oct|nov|dec)\.?\s*(\d{4})?\b/);
    if (m && !date) {
      const n = now || new Date();
      const year = m[3] ? +m[3] : n.getFullYear();
      const month = MONTHS[normalize(m[2])];
      if (isValidDate(year, month, +m[1])) {
        date = toISODate(new Date(year, month, +m[1]));
        strip(m[0]);
      }
    }
    // "12/05/2026" ou "12/05" — avec validation calendaire
    m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    if (m && !date) {
      const n = now || new Date();
      const year = m[3] ? +m[3] : n.getFullYear();
      const month = +m[2] - 1, day = +m[1];
      if (isValidDate(year, month, day)) {
        date = toISODate(new Date(year, month, day));
        strip(m[0]);
      }
    }

    // jour de semaine (pluriel + faute de frappe tolérée)
    const dayMatch = text.match(DAY_RE);
    if (dayMatch) {
      if (!recurrence && /\b(tous les|toutes les|chaque)\b/.test(text)) {
        recurrence = 'weekly';
        strip('tous les'); strip('toutes les'); strip('chaque');
      }
      if (!date) date = nextDayOfWeek(DAYS[dayMatch[1]], now);
      strip(dayMatch[0]);
    } else {
      // faute de frappe : "mecredi" -> mercredi
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (words[i].length >= 4) {
          const dayNum = matchDayWord(words[i]);
          if (dayNum !== null && !DAYS[words[i].replace(/s$/, '')]) {
            if (!date) date = nextDayOfWeek(dayNum, now);
            strip(words[i]);
            break;
          }
        }
      }
    }
    // "lundi prochain" / "prochain lundi" : on retire juste le mot
    strip('prochain'); strip('prochaine');

    // plage horaire "18h à 20h" / "18h-20h" / "18h jusqu'à 20h"
    let start = null, end = null;
    const range = text.match(/\b(\d{1,2}[h:]\d{2}|\d{1,2}h)\s*(?:a|à|jusqu ?a|jusqu ?au|-|–|—)\s*(\d{1,2}[h:]\d{2}|\d{1,2}h)\b/);
    if (range) {
      const t1 = parseTimeToken(range[1]);
      const t2 = parseTimeToken(range[2]);
      if (validTime(t1)) start = t1;
      if (validTime(t2)) end = t2;
      strip(range[0]);
      // plage inversée : on ignore la fin plutôt que de créer un non-sens
      if (start && end && (end.h * 60 + end.m) <= (start.h * 60 + start.m)) end = null;
    } else {
      const single = text.match(/\b(\d{1,2}[h:]\d{2}|\d{1,2}h)\b/);
      if (single) {
        const t = parseTimeToken(single[1]);
        if (validTime(t)) { start = t; strip(single[0]); }
        else strip(single[0]); // "9h99" : on l'enlève du titre sans le garder comme heure
      }
    }

    // durée explicite ; sinon durée implicite 1h (jamais au-delà de minuit affiché)
    if (start && !end) {
      const dur = text.match(/\bpendant\s+(\d{1,2})\s*(h|heures?|min|minutes?)\b/) || text.match(/\b(\d{1,2})\s*(h|heures?|min|minutes?)\b/);
      let minutes = 60;
      if (dur) {
        const val = +dur[1];
        minutes = dur[2].startsWith('h') ? val * 60 : val;
        strip(dur[0]);
      }
      const total = start.h * 60 + start.m + minutes;
      if (total < 24 * 60) end = { h: Math.floor(total / 60), m: total % 60 };
      else end = { h: 23, m: 59 }; // on coince à 23:59 plutôt que de passer à 00:00
    }

    if (!start) allDay = true;

    // titre : découpage en mots, retrait des mots-liens UNIQUEMENT en tête
    const LINK_WORDS = new Set(['le', 'la', 'les', 'du', 'de', 'des', 'au', 'aux', 'a', 'à', 'en', 'et', 'avec', 'pour', 'par', 'vers', "jusqu'au", 'jusquau', 'dans']);
    let words = disp.replace(/\b\d{1,2}[h:]\d{2}\b|\b\d{1,2}h\b/gu, ' ').split(/\s+/).filter(Boolean);
    while (words.length && LINK_WORDS.has(words[0].toLowerCase().replace(/[.,;:!?]$/, ''))) words.shift();
    let title = words.join(' ').trim();
    if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
    if (!title) title = 'Événement';

    const ev = { title, allDay };
    if (date) ev.date = date;
    if (start) ev.start = fmtTime(start);
    if (end) ev.end = fmtTime(end);
    if (recurrence) ev.recurrence = recurrence;
    return ev;
  }

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
   * Séparateurs : point-virgule, retour à la ligne, "puis", "ensuite", virgule + majuscule optionnelle.
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

  return { parse, parseEvent, expandRecurring, normalize, todayISO, nextDayOfWeek, isValidDate, matchDayWord };
});
