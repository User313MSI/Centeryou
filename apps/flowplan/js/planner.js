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
    const events = []; // {id, title, date, start, end, allDay, createdAt}
    let seq = 0;

    function add(ev) {
      if (!ev || typeof ev.title !== 'string' || !ev.title.trim()) {
        throw new Error('Un événement a besoin d\'un titre');
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
        createdAt: new Date().toISOString(),
      };
      events.push(clean);
      return clean;
    }

    function remove(id) {
      const i = events.findIndex(e => e.id === id);
      if (i === -1) return false;
      events.splice(i, 1);
      return true;
    }

    function update(id, patch) {
      const ev = events.find(e => e.id === id);
      if (!ev) return null;
      if (patch.title != null) ev.title = String(patch.title).trim().slice(0, 120) || ev.title;
      if (patch.date !== undefined) ev.date = patch.date || null;
      if (patch.start !== undefined) ev.start = patch.start || null;
      if (patch.end !== undefined) ev.end = patch.end || null;
      if (patch.allDay !== undefined) ev.allDay = !!patch.allDay;
      if (patch.cat !== undefined) ev.cat = patch.cat || null;
      if (patch.color !== undefined) ev.color = patch.color || null;
      return ev;
    }

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
      events.length = 0;
      seq = 0;
      if (Array.isArray(list)) for (const e of list) { events.push(e); seq++; }
    }

    return { add, remove, update, all, byDate, week, conflicts, stats, toJSON, load };
  }

  return { createPlanner, weekStartISO, addDaysISO, overlaps, minutesOf };
});
