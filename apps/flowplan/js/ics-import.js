/*
 * FlowPlan — import de fichiers .ics (iCalendar) : parse robuste, zéro dépendance.
 * Gère le dépliage des lignes (continuation sur ligne suivante commençant par espace),
 * l'échappement \\ \; \, \n, DTSTART/DTEND horaires et DATE, DURATION.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanICSImport = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  function unescapeText(s) {
    return String(s == null ? '' : s)
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  // "20261104T093000" ou "20261104T093000Z" -> { date:'2026-11-04', time:'09:30' } (heure locale si pas de Z : on garde tel quel)
  function parseICSDateTime(v) {
    const m = String(v).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (!m) return null;
    const date = m[1] + '-' + m[2] + '-' + m[3];
    if (!m[4]) return { date: date, time: null };
    return { date: date, time: pad2(+m[4]) + ':' + pad2(+m[5]) };
  }

  function parseDuration(v) {
    const m = String(v).match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) return 0;
    const sign = m[1] === '-' ? -1 : 1;
    const weeks = +(m[2] || 0), days = +(m[3] || 0), hours = +(m[4] || 0), mins = +(m[5] || 0), secs = +(m[6] || 0);
    return sign * (((weeks * 7 + days) * 24 + hours) * 3600 + mins * 60 + secs) * 1000;
  }

  function unfold(text) {
    // déplie les lignes coupées (CRLF + espace/tab = continuation)
    return String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r\n|\n/);
  }

  /*
   * parse(text) -> [{ title, date, start, end, allDay }]
   * Ignore silencieusement les entrées sans date ou invalides.
   */
  function parse(text) {
    const lines = unfold(text);
    const events = [];
    let cur = null;
    for (const line of lines) {
      if (!line) continue;
      const upper = line.toUpperCase();
      if (upper === 'BEGIN:VEVENT') { cur = { props: {} }; continue; }
      if (upper === 'END:VEVENT') {
        if (cur) {
          const ev = toEvent(cur.props);
          if (ev) events.push(ev);
        }
        cur = null;
        continue;
      }
      if (!cur) continue;
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const nameParams = line.slice(0, idx);
      const value = line.slice(idx + 1);
      const name = nameParams.split(';')[0].toUpperCase();
      cur.props[name] = { params: nameParams, value: value };
    }
    return events;
  }

  function toEvent(props) {
    const summary = props.SUMMARY ? unescapeText(props.SUMMARY.value) : '';
    const dtstart = props.DTSTART ? parseICSDateTime(props.DTSTART.value) : null;
    if (!dtstart || !dtstart.date) return null;
    const allDay = /VALUE=DATE/i.test(props.DTSTART.params) || dtstart.time === null;
    let end = null;
    if (props.DTEND) {
      const e = parseICSDateTime(props.DTEND.value);
      if (e) end = e;
    } else if (props.DURATION && dtstart.time) {
      const base = new Date(dtstart.date + 'T' + dtstart.time + ':00');
      const endDt = new Date(base.getTime() + parseDuration(props.DURATION.value));
      end = { date: endDt.getFullYear() + '-' + pad2(endDt.getMonth() + 1) + '-' + pad2(endDt.getDate()), time: pad2(endDt.getHours()) + ':' + pad2(endDt.getMinutes()) };
    }
    return {
      title: summary.trim() || 'Événement importé',
      date: dtstart.date,
      start: allDay ? null : dtstart.time,
      end: allDay ? null : (end && end.date === dtstart.date ? end.time : null),
      allDay: allDay,
    };
  }

  return { parse, unescapeText, parseICSDateTime, parseDuration };
});
