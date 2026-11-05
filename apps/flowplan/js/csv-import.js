/* FlowPlan — import CSV/Excel (séparateur auto, en-têtes FR/EN, guillemets). Zéro dépendance. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanCSV = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  function detectSep(line) {
    const c = { ',': (line.match(/,/g) || []).length, ';': (line.match(/;/g) || []).length, '\t': (line.match(/\t/g) || []).length };
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
  }
  function splitLine(line, sep) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i+1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === sep && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(x => x.trim());
  }
  function toISO(d) {
    const raw = String(d || '').trim();
    let m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (!m) { const m2 = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m2) m = [m2[0], m2[3], m2[2], m2[1]]; }
    if (!m) return null;
    let y = +m[3]; if (y < 100) y += 2000;
    const dt = new Date(y, +m[2] - 1, +m[1]);
    if (dt.getFullYear() !== y || dt.getMonth() !== +m[2] - 1 || dt.getDate() !== +m[1]) return null;
    return y + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
  }
  function toTime(t) {
    const m = String(t || '').trim().match(/^(\d{1,2})[:h](\d{2})/);
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return String(h).padStart(2,'0') + ':' + String(mi).padStart(2,'0');
  }
  function parse(text) {
    const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const sep = detectSep(lines[0]);
    const h = splitLine(lines[0], sep).map(x => x.toLowerCase());
    const iT = h.findIndex(x => /^(titre|title|sujet|objet|name)$/.test(x));
    const iD = h.findIndex(x => /^(date|jour|day)$/.test(x));
    const iS = h.findIndex(x => /^(debut|début|start|heure|from)$/.test(x));
    const iE = h.findIndex(x => /^(fin|end|jusqu|to)$/.test(x));
    const iA = h.findIndex(x => /^(journee|allday|all.day)$/.test(x));
    const out = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = splitLine(lines[r], sep);
      const title = iT >= 0 ? cols[iT] : cols[0];
      if (!title) continue;
      const date = iD >= 0 ? toISO(cols[iD]) : null;
      if (!date) continue;
      const start = iS >= 0 ? toTime(cols[iS]) : null;
      const end = iE >= 0 ? toTime(cols[iE]) : null;
      const allDay = iA >= 0 ? /^(1|oui|yes|true|x)$/i.test(cols[iA] || '') : !start;
      out.push({ title: title.slice(0,120), date, start: allDay ? null : start, end: allDay ? null : end, allDay });
    }
    return out;
  }
  return { parse, detectSep, toISO, toTime };
});
