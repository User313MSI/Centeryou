/*
 * FlowPlan — "brain" : moteur de suggestions local (zéro réseau).
 * - detectRoutines : repère les événements récurrents (même titre, même jour/heure) et propose une récurrence
 * - suggestSlots : propose des créneaux libres pour un événement à placer
 * - suggestReschedule : en cas de conflit, propose de décaler l'un des deux événements
 * Testable en Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanBrain = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function mins(t) { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }

  /* Détecte les routines : groupes d'événements avec titre similaire sur des jours différents.
     Retourne [{title, count, weekday, start, suggestion}] */
  function detectRoutines(events, now) {
    const byTitle = {};
    for (const e of events) {
      if (!e.date) continue;
      const key = (e.title || '').toLowerCase().trim();
      if (key.length < 3) continue;
      (byTitle[key] = byTitle[key] || []).push(e);
    }
    const out = [];
    for (const [title, list] of Object.entries(byTitle)) {
      if (list.length < 3) continue;
      const days = [...new Set(list.map(e => new Date(e.date + 'T12:00:00').getDay()))];
      const starts = [...new Set(list.filter(e => e.start).map(e => e.start))];
      if (days.length === 1 && list.length >= 3) {
        out.push({
          title: list[0].title, count: list.length, weekday: days[0], start: starts[0] || null,
          suggestion: 'Routine détectée : « ' + list[0].title + ' » ' + list.length + '× le même jour' + (starts[0] ? ' à ' + starts[0] : '') + '. La rendre récurrente ?',
        });
      }
    }
    return out;
  }

  /* Créneaux libres d'un jour (8h-20h), blocs de 30 min */
  function freeSlots(dayEvents, minMinutes) {
    const dur = Math.max(30, minMinutes || 60);
    const busy = dayEvents.filter(e => !e.allDay && e.start && e.end)
      .map(e => [mins(e.start), mins(e.end)]).filter(x => x[0] != null && x[1] != null)
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [s, e] of busy) {
      if (merged.length && s <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      else merged.push([s, e]);
    }
    const slots = [];
    let cursor = 8 * 60;
    for (const [s, e] of merged) {
      if (s - cursor >= dur) slots.push([cursor, s]);
      cursor = Math.max(cursor, e);
    }
    if (20 * 60 - cursor >= dur) slots.push([cursor, 20 * 60]);
    const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    return slots.map(([a, b]) => ({ start: fmt(a), end: fmt(Math.min(b, a + dur)) }));
  }

  /* Propose où placer un événement (titre, durée estimée) : cherche le 1er créneau libre de la semaine courante */
  function suggestSlots(events, weekStartISO, title, durationMin, excludeId) {
    const dur = Math.max(30, durationMin || 60);
    const base = new Date(weekStartISO + 'T12:00:00');
    const out = [];
    for (let i = 0; i < 7 && out.length < 5; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayEv = events.filter(e => e.date === iso && e.id !== excludeId);
      for (const slot of freeSlots(dayEv, dur)) {
        out.push({ date: iso, start: slot.start, end: slot.end, title: title });
        if (out.length >= 5) break;
      }
    }
    return out;
  }

  /* Replanification auto : si A et B se chevauchent le même jour, propose de décaler B après A */
  function suggestReschedule(a, b) {
    if (!a || !b || a.date !== b.date || !a.end || !b.start || a.allDay || b.allDay) return null;
    const aEnd = mins(a.end), bStart = mins(b.start), bEnd = mins(b.end);
    if (aEnd == null || bStart == null || bEnd == null) return null;
    if (bStart >= aEnd) return null; // pas de conflit
    const newStart = aEnd;
    const newEnd = newStart + (bEnd - bStart);
    if (newEnd > 22 * 60) return { action: 'warning', message: 'Conflit : impossible de décaler « ' + b.title + ' » après « ' + a.title + ' » avant 22h.' };
    const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    return {
      action: 'move', eventId: b.id,
      to: { start: fmt(newStart), end: fmt(newEnd) },
      message: 'Conflit détecté : « ' + b.title + ' » déplacé à ' + fmt(newStart) + '–' + fmt(newEnd) + ' (après « ' + a.title + ' »).',
    };
  }

  return { detectRoutines, freeSlots, suggestSlots, suggestReschedule };
});
