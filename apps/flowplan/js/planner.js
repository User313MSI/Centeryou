/*
 * FlowPlan — moteur de planning : ajoute des événements, détecte les conflits,
 * trie la semaine, calcule des statistiques. Zéro dépendance, testable en Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanPlanner = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function pad2(n) { return String(n).padStart(2, '0'); }

  function toISODate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // lundi de la semaine contenant `date` (ou aujourd'hui)
  function weekStartISO(dateStr, now) {
    const base = dateStr ? new Date(dateStr + 'T12:00:00') : (now || new Date());
    const day = base.getDay(); // 0=dim, 1=lun
    const diff = (day + 6) % 7; // lundi = 0
    const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - diff);
    return toISODate(monday);
  }

  function addDaysISO(iso, n) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  function monthOfISO(iso) { return String(iso).slice(0, 7); }

  function minutesOf(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function overlaps(a, b) {
    if (a.allDay || b.allDay) return false;
    const aS = minutesOf(a.start), aE = minutesOf(a.end);
    const bS = minutesOf(b.start), bE = minutesOf(b.end);
    if (aS == null || bS == null) return false;
    return aS < bE && bS < aE;
  }

  function createPlanner() {
    const events = []; // {id, title, date, start, end, allDay, cat, color, createdAt}
    let seq = 0;
    const undoStack = []; // actions inversibles, max 50
    const UNDO_LIMIT = 50;
    let silent = false; // true pendant undo() pour ne pas re-pousser

    function pushHistory(action) {
      if (silent) return;
      undoStack.push(action);
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    }

    function snapshot(ev) {
      return Object.assign({}, ev);
    }

    // dédoublonne : même titre + même date + mêmes horaires = on ignore (anti double-clic sur Générer)
    function findDuplicate(ev) {
      return events.find(e =>
        e.title === ev.title &&
        (e.date || null) === (ev.date || null) &&
        (e.start || null) === (ev.start || null) &&
        (e.end || null) === (ev.end || null) &&
        e.allDay === !!ev.allDay);
    }

    // duplique un événement (nouvel id, même contenu, même jour) — bypass du dédoublonnage
    function duplicate(id) {
      const src = events.find(e => e.id === id);
      if (!src) return null;
      const copy = {
        id: 'ev' + (++seq) + '_' + Date.now().toString(36) + 'd',
        title: src.title,
        date: src.date,
        start: src.start,
        end: src.end,
        allDay: src.allDay,
        cat: src.cat,
        color: src.color,
        notes: src.notes,
        createdAt: new Date().toISOString(),
      };
      events.push(copy);
      pushHistory({ type: 'add', id: copy.id });
      return copy;
    }

    function add(ev) {
      if (!ev || typeof ev.title !== 'string' || !ev.title.trim()) {
        throw new Error('Un événement a besoin d\'un titre');
      }
      const dup = findDuplicate(ev);
      if (dup) return dup; // déjà existant : on ne recrée pas, pas d'historique non plus
      // normalisation défensive : end jamais <= start, date valide
      if (ev.start && ev.end) {
        const s = minutesOf(ev.start), e = minutesOf(ev.end);
        if (s != null && e != null && e <= s) ev = Object.assign({}, ev, { end: null });
      }
      if (ev.date && !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
        ev = Object.assign({}, ev, { date: null });
      }
      const clean = {
        id: 'ev' + (++seq) + '_' + Date.now().toString(36),
        title: ev.title.trim().slice(0, 120),
        date: ev.date || null,
        start: ev.start || null,
        end: ev.end || null,
        allDay: !!ev.allDay,
        cat: ev.cat || null,
        color: ev.color || null,
        notes: typeof ev.notes === 'string' ? ev.notes.slice(0, 2000) : null,
        reminder: Number.isFinite(+ev.reminder) && +ev.reminder >= 0 ? Math.min(+ev.reminder, 10080) : 0,
        createdAt: new Date().toISOString(),
      };
      events.push(clean);
      pushHistory({ type: 'add', id: clean.id });
      return clean;
    }

    function remove(id) {
      const i = events.findIndex(e => e.id === id);
      if (i === -1) return false;
      const old = snapshot(events[i]);
      events.splice(i, 1);
      pushHistory({ type: 'remove', ev: old });
      return true;
    }

    function update(id, patch) {
      const ev = events.find(e => e.id === id);
      if (!ev) return null;
      const before = snapshot(ev);
      if (patch.title != null) ev.title = String(patch.title).trim().slice(0, 120) || ev.title;
      if (patch.date !== undefined) ev.date = patch.date || null;
      if (patch.start !== undefined) ev.start = patch.start || null;
      if (patch.end !== undefined) ev.end = patch.end || null;
      if (patch.allDay !== undefined) ev.allDay = !!patch.allDay;
      if (patch.cat !== undefined) ev.cat = patch.cat || null;
      if (patch.color !== undefined) ev.color = patch.color || null;
      if (patch.notes !== undefined) ev.notes = typeof patch.notes === 'string' ? patch.notes.slice(0, 2000) : null;
      if (patch.reminder !== undefined) ev.reminder = Number.isFinite(+patch.reminder) && +patch.reminder >= 0 ? Math.min(+patch.reminder, 10080) : 0;
      pushHistory({ type: 'update', id: ev.id, before: before, after: snapshot(ev) });
      return ev;
    }

    // annule la dernière action ; retourne une description ou null
    function undo() {
      const action = undoStack.pop();
      if (!action) return null;
      silent = true;
      try {
        if (action.type === 'add') {
          const i = events.findIndex(e => e.id === action.id);
          if (i !== -1) events.splice(i, 1);
          return 'ajout annulé';
        }
        if (action.type === 'remove') {
          events.push(action.ev);
          return 'suppression annulée';
        }
        if (action.type === 'update') {
          const ev = events.find(e => e.id === action.id);
          if (ev) Object.assign(ev, action.before);
          return 'modification annulée';
        }
        if (action.type === 'clear') {
          load(action.events);
          return 'réinitialisation annulée';
        }
      } finally {
        silent = false;
      }
      return null;
    }

    function canUndo() { return undoStack.length > 0; }

    function all() {
      return events.slice().sort((a, b) => {
        const da = a.date || '9999-12-31', db = b.date || '9999-12-31';
        if (da !== db) return da < db ? -1 : 1;
        const sa = a.start || '99:99', sb = b.start || '99:99';
        if (sa !== sb) return sa < sb ? -1 : 1;
        return 0;
      });
    }

    function byDate(iso) {
      return all().filter(e => e.date === iso);
    }

    // événements de la semaine (7 jours à partir du lundi)
    function week(weekStart) {
      const ws = weekStart || weekStartISO(null);
      const days = [];
      for (let i = 0; i < 7; i++) {
        const iso = addDaysISO(ws, i);
        days.push({ date: iso, events: byDate(iso) });
      }
      return { start: ws, days };
    }

    // grille du mois contenant `monthStart` ("YYYY-MM") : 6 semaines x 7 jours depuis le lundi
    function monthGrid(monthStart) {
      const [y, m] = monthStart.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const monday = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7));
      const weeks = [];
      for (let w = 0; w < 6; w++) {
        const days = [];
        for (let d = 0; d < 7; d++) {
          const iso = toISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + d));
          days.push({ date: iso, inMonth: iso.slice(0, 7) === monthStart, events: byDate(iso) });
        }
        weeks.push(days);
      }
      return { month: monthStart, weeks };
    }

    // recherche plein texte (titre + catégorie), insensible aux accents
    function search(q) {
      const n = String(q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      if (!n) return all();
      return all().filter(e =>
        e.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(n) ||
        (e.cat || '').includes(n));
    }

    // conflits : paires d'événements même jour qui se chevauchent
    function conflicts() {
      const out = [];
      const byDay = {};
      for (const e of events) {
        if (!e.date) continue;
        (byDay[e.date] = byDay[e.date] || []).push(e);
      }
      for (const day of Object.keys(byDay)) {
        const list = byDay[day];
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            if (overlaps(list[i], list[j])) out.push({ date: day, a: list[i], b: list[j] });
          }
        }
      }
      return out;
    }

    // ids des événements impliqués dans un conflit (pour les surligner dans l'UI)
    function conflictedIds() {
      const set = new Set();
      for (const c of conflicts()) { set.add(c.a.id); set.add(c.b.id); }
      return set;
    }

    // catégories présentes (pour les filtres UI)
    function categories() {
      const map = new Map();
      for (const e of events) {
        const key = e.cat || 'autre';
        if (!map.has(key)) map.set(key, { cat: key, color: e.color || '#8b98a8', count: 0 });
        map.get(key).count++;
      }
      return Array.from(map.values());
    }

    function stats(weekStart) {
      const w = week(weekStart);
      let count = 0, timed = 0, minutes = 0;
      for (const d of w.days) {
        for (const e of d.events) {
          count++;
          if (!e.allDay && e.start && e.end) {
            timed++;
            const s = minutesOf(e.start), en = minutesOf(e.end);
            if (en > s) minutes += en - s;
          }
        }
      }
      return {
        weekStart: w.start,
        totalEvents: count,
        timedEvents: timed,
        plannedMinutes: minutes,
        plannedHours: Math.round((minutes / 60) * 10) / 10,
        conflicts: conflicts().length,
      };
    }

    function toJSON() { return events.slice(); }
    function load(list) {
      if (!silent && events.length) pushHistory({ type: 'clear', events: events.slice() });
      events.length = 0;
      seq = 0;
      if (Array.isArray(list)) for (const e of list) { events.push(e); seq++; }
    }

    // POINT 12: créneaux libres d'une journée (de 8h à 20h, blocs de 30 min)
    function freeSlots(iso, minMinutes) {
      const dur = Math.max(30, minMinutes || 60);
      const day = byDate(iso).filter(e => !e.allDay && e.start && e.end)
        .map(e => [minutesOf(e.start), minutesOf(e.end)]).sort((a, b) => a[0] - b[0]);
      const busy = [];
      for (const [s, e] of day) {
        if (busy.length && s <= busy[busy.length - 1][1]) busy[busy.length - 1][1] = Math.max(busy[busy.length - 1][1], e);
        else busy.push([s, e]);
      }
      const slots = [];
      let cursor = 8 * 60;
      for (const [s, e] of busy) {
        if (s - cursor >= dur) slots.push([cursor, s]);
        cursor = Math.max(cursor, e);
      }
      if (20 * 60 - cursor >= dur) slots.push([cursor, 20 * 60]);
      return slots.map(([a, b]) => ({ start: fmtMin(a), end: fmtMin(Math.min(b, a + dur)) }));
    }
    function fmtMin(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

    // POINT 11: avertit si un nouvel événement chevauche un existant (même jour)
    function wouldConflict(ev) {
      if (!ev.date || ev.allDay || !ev.start || !ev.end) return null;
      const s = minutesOf(ev.start), e = minutesOf(ev.end);
      return events.find(o => o.date === ev.date && !o.allDay && o.start && o.end &&
        s < minutesOf(o.end) && minutesOf(o.start) < e) || null;
    }

    return { add, remove, update, duplicate, undo, canUndo, all, byDate, week, monthGrid, search, findDuplicate, freeSlots, wouldConflict, conflicts, conflictedIds, categories, stats, toJSON, load };
  }

  return { createPlanner, weekStartISO, addDaysISO, monthOfISO, overlaps, minutesOf };
});
