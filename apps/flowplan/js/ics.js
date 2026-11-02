/*
 * FlowPlan — export des événements au format calendrier standard (.ics / iCalendar).
 * Zéro dépendance, testable en Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanICS = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function datePart(iso) { return String(iso).replace(/-/g, ''); }

  function dtStamp(iso, time) {
    const d = datePart(iso);
    if (!time) return d;
    return d + 'T' + String(time).replace(':', '') + '00';
  }

  function icsStamp(isoString) {
    return String(isoString).replace(/[-:]/g, '').replace(/\.\d{3}Z?$/, '');
  }

  /* events: [{id,title,date,start,end,allDay,createdAt}] -> texte .ics */
  function toICS(events) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FlowPlan//FlowPlan//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:FlowPlan',
    ];
    const now = icsStamp(new Date().toISOString());
    for (const e of events || []) {
      if (!e || !e.date) continue;
      lines.push('BEGIN:VEVENT');
      // UID : uniquement [A-Za-z0-9_-], sinon un import calendrier peut échouer
      const uid = String(e.id || 'ev').replace(/[^A-Za-z0-9_-]/g, '');
      lines.push('UID:' + (uid || 'ev') + '@flowplan.local');
      lines.push('DTSTAMP:' + (e.createdAt ? icsStamp(e.createdAt) : now));
      if (e.allDay || !e.start) {
        lines.push('DTSTART;VALUE=DATE:' + datePart(e.date));
        if (e.end) lines.push('DTEND;VALUE=DATE:' + datePart(e.end));
      } else {
        lines.push('DTSTART:' + dtStamp(e.date, e.start));
        if (e.end) lines.push('DTEND:' + dtStamp(e.date, e.end));
      }
      lines.push('SUMMARY:' + esc(e.title));
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  return { toICS, esc, dtStamp };
});
