/* Fuzz test du parser : génère 500 phrases FR réalistes et vérifie les invariants.
   Usage: node tests/fuzz-parser.js — exit 1 si régression. */
const path = require('path');
const Parser = require(path.join(__dirname, '..', 'js', 'parser.js'));

const NOW = new Date(2026, 10, 2, 10, 0, 0); // lundi 2 nov 2026, 10h00
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'aujourd\'hui', 'demain', 'ce soir', 'lundi prochain'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const ACTIVITES = ['réunion équipe','dentiste','sport','déjeuner avec Sam','visio client','cinéma','courses','coiffeur','médecin','appel Martin','lecture','ménage','yoga','guitare','révision examen','appel banque','anniversaire Julie','dîner resto','train Paris','avion Lisbonne'];
const HEURES = ['8h','9h','9h30','10h','12h','14h','14h30','16h','18h','18h30','20h','21h15'];
const LIEUX = ['à Lyon','chez Martin','au bureau','à la salle','en visio','chez le dentiste'];

function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
function genPhrase() {
  const parts = [];
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    let p = '';
    if (Math.random() < 0.7) p += rnd(JOURS) + ' ';
    if (Math.random() < 0.8) p += rnd(HEURES) + ' ';
    if (Math.random() < 0.3) { const h = rnd(HEURES); p += 'de ' + h + ' à ' + h + ' '; }
    p += rnd(ACTIVITES);
    if (Math.random() < 0.3) p += ' ' + rnd(LIEUX);
    if (Math.random() < 0.15) p += ' dans ' + (1 + Math.floor(Math.random() * 4)) + ' semaines';
    if (Math.random() < 0.1) p += ', tous les ' + rnd(JOURS) + 's';
    parts.push(p.trim());
  }
  return parts.join(' ; ');
}

let fails = 0, checked = 0;
const errors = [];
for (let i = 0; i < 500; i++) {
  const phrase = genPhrase();
  checked++;
  try {
    const evs = Parser.parse(phrase, NOW);
    for (const ev of evs) {
      // invariants
      if (!ev.title || typeof ev.title !== 'string' || ev.title.length > 200) { fails++; errors.push('titre invalide: ' + phrase + ' -> ' + JSON.stringify(ev.title)); }
      if (ev.date && !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) { fails++; errors.push('date invalide: ' + phrase + ' -> ' + ev.date); }
      if (ev.date) { const d = new Date(ev.date + 'T12:00:00'); if (isNaN(d) || d.getFullYear() < 2020 || d.getFullYear() > 2035) { fails++; errors.push('date hors plage: ' + ev.date); } }
      if (ev.start && !/^\d{2}:\d{2}$/.test(ev.start)) { fails++; errors.push('heure invalide: ' + ev.start); }
      if (ev.start && ev.end && ev.start >= ev.end && !ev.allDay) { fails++; errors.push('start>=end: ' + phrase + ' -> ' + ev.start + '>' + ev.end); }
    }
  } catch (e) {
    fails++;
    errors.push('CRASH sur « ' + phrase + ' »: ' + e.message);
  }
}
console.log('Fuzz parser: ' + checked + ' phrases, ' + fails + ' problèmes');
if (errors.length) { console.log(errors.slice(0, 10).join('\n')); process.exit(1); }
console.log('FUZZ OK ✓');
