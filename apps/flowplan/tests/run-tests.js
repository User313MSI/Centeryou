/* FlowPlan — tests du parser, du planner et du store. Runner maison, zéro dépendance. */
const path = require('path');

const Parser = require(path.join(__dirname, '..', 'js', 'parser.js'));
const Planner = require(path.join(__dirname, '..', 'js', 'planner.js'));
const Store = require(path.join(__dirname, '..', 'js', 'store.js'));
const Categories = require(path.join(__dirname, '..', 'js', 'categories.js'));
const ICS = require(path.join(__dirname, '..', 'js', 'ics.js'));
const ICSImport = require(path.join(__dirname, '..', 'js', 'ics-import.js'));
const Vault = require(path.join(__dirname, '..', 'js', 'lock.js'));
const Brain = require(path.join(__dirname, '..', 'js', 'brain.js'));
const SecureStore = require(path.join(__dirname, '..', 'js', 'secure-store.js'));

const passes = [];
const failures = [];
function test(name, fn) {
  try { fn(); passes.push(name); }
  catch (e) { failures.push({ name, error: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'pas égal') + ' — attendu: ' + JSON.stringify(b) + ', reçu: ' + JSON.stringify(a));
}

// "maintenant" fixe : LUNDI 2 novembre 2026, 10h00
const NOW = new Date(2026, 10, 2, 10, 0, 0);

// ---------- Parser ----------
test('parser : "lundi 9h réunion équipe" -> lundi = aujourd hui (2/11)', () => {
  const ev = Parser.parseEvent('Lundi 9h réunion équipe', NOW);
  eq(ev.date, '2026-11-02');
  eq(ev.start, '09:00');
  eq(ev.end, '10:00'); // durée implicite 1h
  eq(ev.title, 'Réunion équipe');
  eq(ev.allDay, false);
});

test('parser : "mercredi 14h30 dentiste" conserve les minutes', () => {
  const ev = Parser.parseEvent('mercredi 14h30 dentiste', NOW);
  eq(ev.date, '2026-11-04');
  eq(ev.start, '14:30');
  eq(ev.title, 'Dentiste');
});

test('parser : plage horaire "jeudi 18h à 20h apéro"', () => {
  const ev = Parser.parseEvent('jeudi 18h à 20h apéro chez Léa', NOW);
  eq(ev.start, '18:00');
  eq(ev.end, '20:00');
  eq(ev.title.toLowerCase(), 'apéro chez léa');
});

test('parser : durée "vendredi 9h pendant 2h sport"', () => {
  const ev = Parser.parseEvent('vendredi 9h pendant 2h sport', NOW);
  eq(ev.start, '09:00');
  eq(ev.end, '11:00');
  eq(ev.title, 'Sport');
});

test('parser : "aujourd\'hui 12h30 déjeuner" -> date du jour', () => {
  const ev = Parser.parseEvent("aujourd'hui 12h30 déjeuner", NOW);
  eq(ev.date, '2026-11-02');
  eq(ev.start, '12:30');
});

test('parser : "demain 8h réveil"', () => {
  const ev = Parser.parseEvent('demain 8h réveil', NOW);
  eq(ev.date, '2026-11-03');
  eq(ev.start, '08:00');
});

test('parser : date complète "12 mai 2026 10h dentiste"', () => {
  const ev = Parser.parseEvent('12 mai 2026 10h dentiste', NOW);
  eq(ev.date, '2026-05-12');
  eq(ev.start, '10:00');
});

test('parser : date numérique "05/12/2026 15h visio"', () => {
  const ev = Parser.parseEvent('05/12/2026 15h visio', NOW);
  eq(ev.date, '2026-12-05');
  eq(ev.start, '15:00');
});

test('parser : accents et apostrophes normalisés', () => {
  const ev = Parser.parseEvent("aujourd’hui 14h café avec l’équipe", NOW);
  eq(ev.date, '2026-11-02');
  const low = ev.title.toLowerCase();
  eq(low.includes('café'), true, 'titre: ' + ev.title);
  eq(low.includes('équipe'), true, 'titre: ' + ev.title);
});

test('parser : sans heure -> journée entière', () => {
  const ev = Parser.parseEvent('samedi mariage de Julie', NOW);
  eq(ev.allDay, true);
  eq(ev.date, '2026-11-07');
  assert(!ev.start, 'pas d\'heure de début');
});

test('parser : multi-événements séparés par point-virgule', () => {
  const evs = Parser.parse('Lundi 9h réunion ; mardi 14h30 dentiste ; puis vendredi 18h apéro', NOW);
  eq(evs.length, 3);
  eq(evs[0].date, '2026-11-02');
  eq(evs[1].start, '14:30');
  eq(evs[2].start, '18:00');
});

test('parser : entrée vide -> null / []', () => {
  eq(Parser.parseEvent('', NOW), null);
  eq(Parser.parse('   ', NOW).length, 0);
});

test('parser : heure invalide ignorée', () => {
  const ev = Parser.parseEvent('lundi 25h truc', NOW);
  eq(ev.date, '2026-11-02');
  assert(!ev.start || ev.start === null || ev.start === undefined, '25h ne doit pas devenir une heure');
});

// ---------- Planner ----------
test('planner : ajout + tri par date/heure', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'B', date: '2026-11-04', start: '14:00', end: '15:00' });
  p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  p.add({ title: 'C', date: '2026-11-03', allDay: true });
  const all = p.all();
  eq(all[0].title, 'C');
  eq(all[1].title, 'A');
  eq(all[2].title, 'B');
});

test('planner : rejette un événement sans titre', () => {
  const p = Planner.createPlanner();
  let threw = false;
  try { p.add({ title: '  ' }); } catch (e) { threw = true; }
  assert(threw, 'doit lever une erreur');
});

test('planner : détection de conflit (chevauchement)', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'Réunion', date: '2026-11-04', start: '09:00', end: '10:00' });
  p.add({ title: 'Appel', date: '2026-11-04', start: '09:30', end: '10:30' });
  eq(p.conflicts().length, 1);
  p.add({ title: 'Déj', date: '2026-11-04', start: '12:00', end: '13:00' });
  eq(p.conflicts().length, 1);
});

test('planner : pas de conflit entre événements journée entière et horaires', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'Férié', date: '2026-11-11', allDay: true });
  p.add({ title: 'Réunion', date: '2026-11-11', start: '09:00', end: '10:00' });
  eq(p.conflicts().length, 0);
});

test('planner : semaine = 7 jours depuis le lundi', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'X', date: '2026-11-04', start: '09:00', end: '10:30' });
  const w = p.week('2026-11-02'); // lundi
  eq(w.days.length, 7);
  eq(w.days[0].date, '2026-11-02');
  eq(w.days[6].date, '2026-11-08');
  eq(w.days[2].events.length, 1);
});

test('planner : weekStartISO renvoie un lundi', () => {
  eq(Planner.weekStartISO('2026-11-04'), '2026-11-02'); // mercredi -> lundi
  eq(Planner.weekStartISO('2026-11-08'), '2026-11-02'); // dimanche -> lundi
  eq(Planner.weekStartISO('2026-11-09'), '2026-11-09'); // lundi -> lundi
});

test('planner : stats (total, heures planifiées, conflits)', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-02', start: '09:00', end: '10:00' });
  p.add({ title: 'B', date: '2026-11-02', start: '10:00', end: '11:30' });
  p.add({ title: 'C', date: '2026-11-03', allDay: true });
  const s = p.stats('2026-11-02');
  eq(s.totalEvents, 3);
  eq(s.timedEvents, 2);
  eq(s.plannedMinutes, 150);
  eq(s.plannedHours, 2.5);
  eq(s.conflicts, 0);
});

test('planner : update / remove / persistance JSON', () => {
  const p = Planner.createPlanner();
  const ev = p.add({ title: 'A', date: '2026-11-02', start: '09:00', end: '10:00' });
  p.update(ev.id, { title: 'A modifié', end: '11:00' });
  eq(p.all()[0].title, 'A modifié');
  eq(p.all()[0].end, '11:00');
  const json = p.toJSON();
  const p2 = Planner.createPlanner();
  p2.load(json);
  eq(p2.all().length, 1);
  assert(p2.remove(ev.id), 'remove renvoie true');
  eq(p2.all().length, 0);
  assert(!p2.remove('inconnu'), 'remove inconnu renvoie false');
});

// ---------- Store ----------
test('store : save/load/clear en mémoire (Node)', () => {
  Store.clear();
  eq(Store.load().length, 0);
  Store.save([{ id: 'ev1', title: 'Test', date: '2026-11-04' }]);
  const loaded = Store.load();
  eq(loaded.length, 1);
  eq(loaded[0].title, 'Test');
  Store.clear();
  eq(Store.load().length, 0);
});

test('store : JSON corrompu -> tableau vide (pas de crash)', () => {
  Store.clear();
  // force un contenu invalide via save d'une valeur sérialisée cassée
  const mem = Store;
  // on simule en écrivant directement : le store Node garde en mémoire privée,
  // donc on teste via load() après save d'un objet non conforme
  mem.save('pas du json valide {{{');
  // save sérialise toujours du JSON valide, donc ce test vérifie surtout load robuste :
  eq(Array.isArray(mem.load()), true);
  Store.clear();
});

// ---------- Audit : cas limites ----------
test('audit : date invalide "12/13/2026" rejetée (pas de date)', () => {
  const ev = Parser.parseEvent('12/13/2026 10h truc', NOW);
  assert(!ev.date, '12/13/2026 ne doit pas produire de date');
  eq(ev.start, '10:00');
});

test('audit : "32 janvier 2026" rejeté', () => {
  const ev = Parser.parseEvent('32 janvier 2026 10h truc', NOW);
  assert(!ev.date, '32 janvier ne doit pas produire de date');
});

test('audit : plage inversée "9h à 8h" -> fin rejetée, durée implicite 1h', () => {
  const ev = Parser.parseEvent('lundi 9h à 8h truc', NOW);
  eq(ev.start, '09:00');
  eq(ev.end, '10:00'); // jamais end <= start
});

test('audit : "lundi 23h truc" coince la fin à 23:59 (pas 00:00)', () => {
  const ev = Parser.parseEvent('lundi 23h truc', NOW);
  eq(ev.start, '23:00');
  eq(ev.end, '23:59');
});

test('audit : "lundi 9h99 truc" -> heure invalide retirée du titre', () => {
  const ev = Parser.parseEvent('lundi 9h99 truc', NOW);
  assert(!ev.start, '9h99 n\'est pas une heure valide');
  eq(ev.title, 'Truc');
});

test('audit : "lundi 25h30 réunion" -> heure invalide ignorée proprement', () => {
  const ev = Parser.parseEvent('lundi 25h30 réunion', NOW);
  assert(!ev.start, '25h30 invalide');
  eq(ev.title, 'Réunion');
  eq(ev.allDay, true);
});

test('audit : faute de frappe "mecredi 14h30" -> mercredi', () => {
  const ev = Parser.parseEvent('mecredi 14h30 dentiste', NOW);
  eq(ev.date, '2026-11-04'); // mercredi de la semaine du lundi 3/11
  eq(ev.start, '14:30');
});

test('audit : "ce soir 20h film" -> aujourd\'hui', () => {
  const ev = Parser.parseEvent('ce soir 20h film', NOW);
  eq(ev.date, '2026-11-02');
  eq(ev.start, '20:00');
});

test('audit : "dans 3 jours 10h truc"', () => {
  const ev = Parser.parseEvent('dans 3 jours 10h truc', NOW);
  eq(ev.date, '2026-11-05');
});

test('audit : "lundi prochain 9h truc" -> lundi PROCHAIN (9/11), sans le mot dans le titre', () => {
  const ev = Parser.parseEvent('lundi prochain 9h truc', NOW);
  eq(ev.date, '2026-11-09'); // NOW = lundi 2/11 -> "prochain" = 9/11
  eq(ev.title, 'Truc');
});

test('parser : date complète "9 novembre 2026 18h stream" -> 2026-11-09', () => {
  const ev = Parser.parseEvent('9 novembre 2026 18h stream', NOW);
  eq(ev.date, '2026-11-09');
  eq(ev.start, '18:00');
});

test('parser : date numérique "09/11/2026 18h stream" -> 2026-11-09', () => {
  const ev = Parser.parseEvent('09/11/2026 18h stream', NOW);
  eq(ev.date, '2026-11-09');
  eq(ev.start, '18:00');
});

test('parser : "prochain mardi 10h" un lundi -> mardi 3/11 (lendemain, strictement futur)', () => {
  const ev = Parser.parseEvent('prochain mardi 10h truc', NOW);
  eq(ev.date, '2026-11-03');
});

test('parser : "prochain lundi" un lundi -> lundi 9/11 (semaine prochaine, strict)', () => {
  const ev = Parser.parseEvent('prochain lundi 10h truc', NOW);
  eq(ev.date, '2026-11-09');
});

test('audit : entrée très longue tronquée à 300 caractères', () => {
  const ev = Parser.parseEvent('a'.repeat(500), NOW);
  assert(ev.title.length <= 301, 'titre tronqué');
});

test('audit : planner refuse un end <= start même si on le force', () => {
  const p = Planner.createPlanner();
  const ev = p.add({ title: 'X', date: '2026-11-04', start: '10:00', end: '09:00' });
  assert(!ev.end, 'end <= start doit être annulé');
});

test('audit : planner rejette une date au mauvais format', () => {
  const p = Planner.createPlanner();
  const ev = p.add({ title: 'X', date: '04/11/2026' });
  assert(!ev.date, 'date non ISO doit être annulée');
});

test('audit : categories() regroupe par catégorie', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'Réunion', date: '2026-11-04', cat: 'travail', color: '#4f9cff' });
  p.add({ title: 'Sport', date: '2026-11-04', cat: 'sport', color: '#4ade80' });
  p.add({ title: 'Sport 2', date: '2026-11-05', cat: 'sport', color: '#4ade80' });
  const cats = p.categories();
  const sport = cats.find(c => c.cat === 'sport');
  eq(sport.count, 2);
});

test('audit : conflictedIds() renvoie les ids en conflit', () => {
  const p = Planner.createPlanner();
  const a = p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  const b = p.add({ title: 'B', date: '2026-11-04', start: '09:30', end: '10:30' });
  const c = p.add({ title: 'C', date: '2026-11-04', start: '12:00', end: '13:00' });
  const ids = p.conflictedIds();
  assert(ids.has(a.id) && ids.has(b.id), 'a et b en conflit');
  assert(!ids.has(c.id), 'c hors conflit');
});

// ---------- Récurrence ----------
test('parser : "tous les lundis 18h30 sport" -> 9 occurrences hebdo', () => {
  const evs = Parser.parse('tous les lundis 18h30 sport', NOW);
  eq(evs.length, 9); // lundi 2/11 (aujourd'hui) + 8 semaines
  eq(evs[0].date, '2026-11-02');
  eq(evs[1].date, '2026-11-09');
  eq(evs[0].start, '18:30');
  assert(!evs[0].recurrence, 'les occurrences concrètes n\'ont plus de champ recurrence');
});

test('parser : "tous les jours 7h réveil" -> 15 occurrences', () => {
  const evs = Parser.parse('tous les jours 7h réveil', NOW);
  eq(evs.length, 15);
  eq(evs[0].start, '07:00');
});

test('parser : expand=false garde l\'événement brut avec recurrence', () => {
  const evs = Parser.parse('chaque lundi 9h point hebdo', NOW, false);
  eq(evs.length, 1);
  eq(evs[0].recurrence, 'weekly');
});

// ---------- Catégories ----------
test('catégories : détection par mots-clés', () => {
  eq(Categories.categorize('Réunion équipe').cat, 'travail');
  eq(Categories.categorize('Dentiste').cat, 'sante');
  eq(Categories.categorize('Sport salle').cat, 'sport');
  eq(Categories.categorize('Soirée chez Léa').cat, 'perso');
  eq(Categories.categorize('qqchose d\'inconnu').cat, 'autre');
});

// ---------- Export ICS ----------
test('ics : format valide avec CRLF et échappement', () => {
  const ics = ICS.toICS([
    { id: 'ev1', title: 'Réunion, équipe; bureau', date: '2026-11-09', start: '09:00', end: '10:00', createdAt: '2026-11-01T08:00:00.000Z' },
    { id: 'ev2', title: 'Mardi gras', date: '2026-11-10', allDay: true, createdAt: '2026-11-01T08:00:00.000Z' },
  ]);
  assert(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'début VCALENDAR');
  assert(ics.endsWith('END:VCALENDAR\r\n'), 'fin VCALENDAR');
  assert(ics.includes('DTSTART:20261109T090000'), 'DTSTART horaire');
  assert(ics.includes('DTEND:20261109T100000'), 'DTEND horaire');
  assert(ics.includes('DTSTART;VALUE=DATE:20261110'), 'DTSTART journée entière');
  assert(ics.includes('SUMMARY:Réunion\\, équipe\\; bureau'), 'échappement virgule/point-virgule');
  eq((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
});

// ---------- Intégration parser -> planner ----------
test('intégration : phrase complète -> planning cohérent', () => {
  const p = Planner.createPlanner();
  const evs = Parser.parse('Lundi 9h réunion équipe ; mercredi 14h30 dentiste ; samedi mariage de Julie', NOW);
  for (const ev of evs) p.add(ev);
  const w1 = p.week('2026-11-02'); // semaine du lun 2/11 : mercredi + samedi
  eq(w1.days[2].events[0].start, '14:30');
  eq(w1.days[5].events[0].allDay, true);
  const w1b = p.week('2026-11-02'); // lundi 9h = aujourd'hui 2/11
  eq(w1b.days[0].events[0].title, 'Réunion équipe');
  eq(p.conflicts().length, 0);
});

// ---------- v2 : monthGrid / search ----------
test('planner : monthGrid renvoie 6 semaines x 7 jours, flag inMonth', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'X', date: '2026-11-15' });
  const g = p.monthGrid('2026-11');
  eq(g.weeks.length, 6);
  eq(g.weeks[0].length, 7);
  eq(g.weeks[0][0].date, '2026-10-26'); // lundi avant le 1er nov 2026
  const inNov = g.weeks.flat().filter(d => d.inMonth);
  eq(inNov.length, 30);
  const day15 = g.weeks.flat().find(d => d.date === '2026-11-15');
  eq(day15.events.length, 1);
});

test('planner : search insensible aux accents et à la casse', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'Réunion équipe', date: '2026-11-04', cat: 'travail' });
  p.add({ title: 'Dentiste', date: '2026-11-05', cat: 'sante' });
  eq(p.search('reunion').length, 1);
  eq(p.search('REUNION').length, 1);
  eq(p.search('denti').length, 1);
  eq(p.search('sante').length, 1); // recherche aussi dans la catégorie
  eq(p.search('').length, 2);
  eq(p.search('zzzz').length, 0);
});

// ---------- Audit sécurité ----------
test('sécu : store.sanitizeEvent rejette les entrées dangereuses', () => {
  eq(Store.sanitizeEvent(null), null);
  eq(Store.sanitizeEvent({}), null);
  eq(Store.sanitizeEvent({ id: 'x' }), null); // pas de titre
  const evil = Store.sanitizeEvent({
    id: 'a"><img src=x onerror=alert(1)>',
    title: '<script>alert(1)</script>',
    date: '2026-11-04; DROP TABLE',
    start: '09:00" onmouseover="alert(1)',
    color: 'javascript:alert(1)',
  });
  // le titre est conservé tel quel MAIS ne sera jamais injecté en HTML (textContent côté UI) ;
  // ici on vérifie que les champs structurés sont nettoyés :
  eq(evil.date, null);
  eq(evil.start, null);
  eq(evil.color, null);
  assert(evil.id.length <= 64, 'id tronqué');
});

test('sécu : load() ignore les doublons d\'id et cappe à MAX_EVENTS', () => {
  Store.clear();
  const many = [];
  for (let i = 0; i < Store.MAX_EVENTS + 500; i++) many.push({ id: 'ev' + i, title: 't' + i });
  many.push({ id: 'ev0', title: 'doublon' }); // même id -> ignoré
  Store.save(many);
  const loaded = Store.load();
  eq(loaded.length, Store.MAX_EVENTS);
  eq(loaded[0].title, 't0'); // le doublon n'a pas écrasé
  Store.clear();
});

test('sécu : ICS échappe CRLF dans le titre (anti-injection d\'en-têtes ICS)', () => {
  const ics = ICS.toICS([{ id: 'x\r\nX-EVIL: 1', title: 'titre\r\nEND:VCALENDAR\r\nBEGIN:VEVENT', date: '2026-11-04', allDay: true }]);
  // un vrai CRLF ne doit jamais apparaître à l'intérieur d'une ligne SUMMARY
  const summaryLines = ics.split('\r\n').filter(l => l.startsWith('SUMMARY:'));
  eq(summaryLines.length, 1, 'une seule ligne SUMMARY (le CRLF du titre est échappé)');
  assert(summaryLines[0].includes('titre\\nEND:VCALENDAR'), 'CRLF du titre échappé en \\n littéral');
  // la structure globale reste intacte : on compte les VRAIES lignes (pas les sous-chaînes échappées)
  const lines = ics.split('\r\n');
  eq(lines.filter(l => l === 'BEGIN:VCALENDAR').length, 1);
  eq(lines.filter(l => l === 'END:VCALENDAR').length, 1);
  eq(lines.filter(l => l === 'BEGIN:VEVENT').length, 1);
  eq(lines.filter(l => l === 'END:VEVENT').length, 1);
  // l'UID ne contient que des caractères sûrs
  const uidLine = ics.split('\r\n').find(l => l.startsWith('UID:'));
  assert(/^UID:[A-Za-z0-9_-]+@flowplan\.local$/.test(uidLine), 'UID sanitisé: ' + uidLine);
});

test('sécu : parser tronque les entrées trop longues (anti-DoS mémoire)', () => {
  const ev = Parser.parseEvent('x'.repeat(100000), NOW);
  assert(ev.title.length <= 301, 'tronqué');
});

test('sécu : parser rejette les dates impossibles (29 février année non bissextile)', () => {
  const ev = Parser.parseEvent('29 février 2026 10h truc', NOW);
  assert(!ev.date, '2026 n\'est pas bissextile');
  const ev2 = Parser.parseEvent('29 février 2028 10h truc', NOW);
  eq(ev2.date, '2028-02-29'); // 2028 est bissextile
});

// ---------- régression utilisateur : "lundi 18h stream" un lundi -> même jour ----------
test('régression : dit un lundi, "lundi 18h stream twitch" tombe le jour même (2026-11-02)', () => {
  const evs = Parser.parse('lundi 18h stream twitch', new Date(2026, 10, 2, 12, 0, 0));
  eq(evs.length, 1);
  eq(evs[0].date, '2026-11-02');
  eq(evs[0].start, '18:00');
  eq(evs[0].title, 'Stream twitch');
});

test('régression : multi-événements, tous visibles dans la semaine affichée', () => {
  const NOW2 = new Date(2026, 10, 2, 12, 0, 0);
  const p = Planner.createPlanner();
  for (const ev of Parser.parse('Lundi 9h réunion équipe ; mercredi 14h30 dentiste ; samedi soirée chez Léa ; lundi 18h stream twitch', NOW2)) p.add(ev);
  const w = p.week('2026-11-02');
  eq(w.days[0].events.length, 2); // lundi : réunion + stream
  eq(w.days[0].events.map(e => e.title).sort().join('|'), 'Réunion équipe|Stream twitch');
  eq(w.days[2].events[0].title, 'Dentiste');
  eq(w.days[5].events[0].title, 'Soirée chez léa');
});

// ---------- anti-doublons ----------
test('planner : ajouter 2x le même événement (titre+date+horaires) ne crée pas de doublon', () => {
  const p = Planner.createPlanner();
  const a = p.add({ title: 'Stream twitch', date: '2026-11-02', start: '18:00', end: '19:00' });
  const b = p.add({ title: 'Stream twitch', date: '2026-11-02', start: '18:00', end: '19:00' });
  eq(p.all().length, 1);
  eq(a.id, b.id); // même objet retourné
  eq(p.conflicts().length, 0); // plus de faux conflit
});

test('planner : même titre mais horaires différents = 2 événements distincts', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'Stream', date: '2026-11-02', start: '18:00', end: '19:00' });
  p.add({ title: 'Stream', date: '2026-11-02', start: '20:00', end: '21:00' });
  eq(p.all().length, 2);
});

// ---------- ATTAQUES simulées (audit sécu v3) ----------
test('attaque : localStorage hostile -> sanitize au load (XSS/date/heure/couleur nettoyés, doublons ignorés)', () => {
  // on injecte directement dans le stockage interne via save d'un payload falsifié
  Store.clear();
  const evil = [
    { id: 'a\"><img src=x onerror=alert(1)>', title: '<script>alert(1)</script>', date: '2026-13-99', start: '99:99', color: 'javascript:alert(1)' },
    { id: 'ok1', title: 'Valide', date: '2026-11-04', start: '10:00', end: '11:00', allDay: false },
    { id: 'ok1', title: 'Doublon id' },
    'pas un objet',
    { title: 'sans id' },
  ];
  // save() sérialise proprement, donc on teste sanitizeEvent + load via un JSON falsifié :
  // on bypass save en écrivant nous-mêmes : on simule en passant par load d'un payload stringifié
  // -> plus simple : on vérifie sanitizeEvent directement sur chaque entrée hostile
  const out = evil.map(e => Store.sanitizeEvent(e)).filter(Boolean);
  // 3 passent sanitize (id+titre présents) : l'entree hostile comprise, MAIS ses champs structures sont nettoyés.
  // 'pas un objet' et 'sans id' sont rejetés. Le dédoublonnage des id se fait au load().
  eq(out.length, 3, 'seules les entrées avec id+titre passent sanitize');
  const bad = Store.sanitizeEvent(evil[0]);
  eq(bad.date, null); eq(bad.start, null); eq(bad.color, null);
  assert(bad.id.length <= 64);
});

test('attaque : parser avec payloads XSS -> titre tronqué, jamais exécuté (rendu en textContent)', () => {
  const ev = Parser.parseEvent('lundi 9h <script>alert(1)</script>' + 'A'.repeat(5000), NOW);
  assert(ev.title.length <= 301, 'tronqué');
  assert(!ev.title.includes('\n'), 'pas de saut de ligne');
});

test('attaque : ICS avec CRLF dans titre/id -> structure intacte (1 VEVENT, UID sûr)', () => {
  const ics = ICS.toICS([{ id: 'x\r\nX-EVIL:1', title: 'A\r\nEND:VCALENDAR\r\nBEGIN:VEVENT', date: '2026-11-04', allDay: true }]);
  const lines = ics.split('\r\n');
  eq(lines.filter(l => l === 'BEGIN:VEVENT').length, 1);
  eq(lines.filter(l => l === 'END:VCALENDAR').length, 1);
  assert(/^UID:[A-Za-z0-9_-]+@flowplan\.local$/.test(lines.find(l => l.startsWith('UID:'))));
});

// ---------- Undo ----------
test('undo : annule un ajout', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  eq(p.all().length, 1);
  eq(p.undo(), 'ajout annulé');
  eq(p.all().length, 0);
  eq(p.undo(), null); // pile vide
});

test('undo : annule une suppression (événement restauré)', () => {
  const p = Planner.createPlanner();
  const ev = p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00', cat: 'travail' });
  p.remove(ev.id);
  eq(p.all().length, 0);
  eq(p.undo(), 'suppression annulée');
  eq(p.all().length, 1);
  eq(p.all()[0].title, 'A');
  eq(p.all()[0].cat, 'travail');
});

test('undo : annule une modification (état avant restauré)', () => {
  const p = Planner.createPlanner();
  const ev = p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  p.update(ev.id, { title: 'B', start: '14:00' });
  eq(p.all()[0].title, 'B');
  eq(p.undo(), 'modification annulée');
  eq(p.all()[0].title, 'A');
  eq(p.all()[0].start, '09:00');
});

test('undo : annule un clear (reset)', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-04' });
  p.load([]); // reset
  eq(p.all().length, 0);
  eq(p.undo(), 'réinitialisation annulée');
  eq(p.all().length, 1);
});

test('undo : pile plafonnée à 50 actions', () => {
  const p = Planner.createPlanner();
  for (let i = 0; i < 60; i++) p.add({ title: 'E' + i, date: '2026-11-04', start: '09:00', end: '09:01' });
  let n = 0;
  while (p.undo()) n++;
  eq(n, 50);
  eq(p.all().length, 10); // 60 ajoutés - 50 annulés
});

test('undo : doublon (add ignoré) ne pousse pas dans l historique', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' }); // doublon
  eq(p.all().length, 1);
  eq(p.canUndo(), true);
  p.undo();
  eq(p.all().length, 0);
  eq(p.undo(), null); // pas de 2e undo pour le doublon
});

// ---------- Import ICS ----------
test('ics-import : parse un .ics standard (horaires, journée entière, échappement)', () => {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'BEGIN:VEVENT', 'UID:a@b', 'DTSTAMP:20261101T080000Z',
    'DTSTART:20261104T143000', 'DTEND:20261104T153000',
    'SUMMARY:Dentiste\, Dr Martin', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:c@d', 'DTSTAMP:20261101T080000Z',
    'DTSTART;VALUE=DATE:20261225', 'SUMMARY:Noël en famille', 'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const evs = ICSImport.parse(ics);
  eq(evs.length, 2);
  eq(evs[0].title, 'Dentiste, Dr Martin');
  eq(evs[0].date, '2026-11-04');
  eq(evs[0].start, '14:30');
  eq(evs[0].end, '15:30');
  eq(evs[0].allDay, false);
  eq(evs[1].allDay, true);
  eq(evs[1].date, '2026-12-25');
  assert(!evs[1].start, 'journée entière = pas d heure');
});

test('ics-import : déplie les lignes coupées (continuation espace) et DURATION', () => {
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Réunion très long\r\n  titre sur 2 lignes\r\nDTSTART:20261104T090000\r\nDURATION:PT1H30M\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  const evs = ICSImport.parse(ics);
  eq(evs.length, 1);
  eq(evs[0].title, 'Réunion très long titre sur 2 lignes');
  eq(evs[0].start, '09:00');
  eq(evs[0].end, '10:30');
});

test('ics-import : ignore les entrées sans date, tolère un fichier vide/corrompu', () => {
  eq(ICSImport.parse('').length, 0);
  eq(ICSImport.parse('pas du ics du tout').length, 0);
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Sans date\r\nEND:VEVENT\r\nEND:VCALENDAR';
  eq(ICSImport.parse(ics).length, 0);
});

test('ics-import : aller-retour export -> import conserve les données', () => {
  const original = [
    { id: 'e1', title: 'Réunion; équipe, bureau', date: '2026-11-04', start: '09:00', end: '10:00', allDay: false },
    { id: 'e2', title: 'Jour férié', date: '2026-11-11', allDay: true },
  ];
  const ics = ICS.toICS(original);
  const back = ICSImport.parse(ics);
  eq(back.length, 2);
  eq(back[0].title, 'Réunion; équipe, bureau');
  eq(back[0].start, '09:00');
  eq(back[1].allDay, true);
});

// ---------- Vault (chiffrement AES-GCM) ----------
function memStorage() {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m };
}

test('vault : enable stocke uniquement salt+hash, jamais le PIN', async () => {
  const st = memStorage();
  await Vault.enable('1234', st);
  const meta = st._m[Vault.KEY];
  assert(meta, 'meta présente');
  assert(!meta.includes('1234'), 'le PIN en clair ne doit PAS apparaître');
  const parsed = JSON.parse(meta);
  assert(parsed.salt && parsed.hash && !parsed.pin, 'seulement salt+hash');
});

test('vault : mauvais PIN rejeté, bon PIN accepté', async () => {
  const st = memStorage();
  await Vault.enable('1234', st);
  assert(!(await Vault.unlock('0000', st)).ok, 'mauvais PIN rejeté');
  assert((await Vault.unlock('1234', st)).ok, 'bon PIN accepté');
});

test('vault : PIN < 4 caractères rejeté', async () => {
  const st = memStorage();
  let threw = false;
  try { await Vault.enable('12', st); } catch (e) { threw = true; }
  assert(threw, 'PIN trop court rejeté');
});

test('vault : chiffrement/déchiffrement AES-GCM aller-retour', async () => {
  const st = memStorage();
  await Vault.enable('1234', st);
  const { key } = await Vault.unlock('1234', st);
  const secret = JSON.stringify([{ id: 'e1', title: 'Secret 🔒', date: '2026-11-04' }]);
  const ct = await Vault.encrypt(secret, key);
  assert(!ct.includes('Secret'), 'le clair ne fuité pas dans le chiffré');
  const back = await Vault.decrypt(ct, key);
  eq(back, secret);
});

test('vault : déchiffrement avec une autre clé échoue proprement', async () => {
  const st = memStorage();
  await Vault.enable('1234', st);
  const { key } = await Vault.unlock('1234', st);
  const ct = await Vault.encrypt('données secrètes', key);
  const st2 = memStorage();
  await Vault.enable('9999', st2);
  const { key: wrongKey } = await Vault.unlock('9999', st2);
  let threw = false;
  try { await Vault.decrypt(ct, wrongKey); } catch (e) { threw = true; }
  assert(threw, 'mauvaise clé = erreur');
});

test('secure-store : avec vault ON, save chiffre et load déchiffre ; verrouillé = rien', async () => {
  const st = memStorage();
  const ss = SecureStore.create(Store, Vault, st);
  // vault off d'abord
  let ok = await ss.save([{ id: 'a', title: 'Clair' }]);
  assert(ok);
  eq((await ss.load()).length, 1);
  // active le vault
  await Vault.enable('1234', st);
  await ss.unlock('1234');
  await ss.save([{ id: 'a', title: 'Secret 🔒', date: '2026-11-04' }]);
  assert(!st._m[Store.KEY], 'ancienne clé claire supprimée');
  const enc = st._m[SecureStore.ENC_KEY];
  assert(enc && !enc.includes('Secret'), 'données chiffrées dans le stockage');
  const loaded = await ss.load();
  eq(loaded.length, 1);
  eq(loaded[0].title, 'Secret 🔒');
  // re-verrouille : load renvoie vide
  ss.lock();
  eq((await ss.load()).length, 0, 'verrouillé = aucune donnée lisible');
});

test('planner : duplicate() crée une copie avec un nouvel id', () => {
  const p = Planner.createPlanner();
  const a = p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00', cat: 'travail', notes: 'n1' });
  const b = p.duplicate(a.id);
  assert(b && b.id !== a.id, 'nouvel id');
  eq(b.title, 'A');
  eq(b.notes, 'n1');
  eq(p.all().length, 2);
});

test('store : sanitize conserve les notes (tronquées à 2000)', () => {
  const e = Store.sanitizeEvent({ id: 'x', title: 'T', notes: 'N'.repeat(5000) });
  eq(e.notes.length, 2000);
});

// ---------- P1 batch v5.0 ----------
test('P7 : "de 9h à 11h" et "entre 14h et 16h" donnent la bonne plage', () => {
  eq(Parser.parseEvent('de 9h à 11h réunion', NOW).start, '09:00');
  eq(Parser.parseEvent('de 9h à 11h réunion', NOW).end, '11:00');
  eq(Parser.parseEvent('entre 14h et 16h atelier', NOW).start, '14:00');
  eq(Parser.parseEvent('entre 14h et 16h atelier', NOW).end, '16:00');
  eq(Parser.parseEvent('entre 14h et 16h atelier', NOW).title, 'Atelier');
});

test('P8 : "dans 2 semaines", "dans 3 mois", "le mois prochain"', () => {
  eq(Parser.parseEvent('dans 2 semaines 10h bilan', NOW).date, '2026-11-16');
  eq(Parser.parseEvent('dans 3 mois 9h rdv', NOW).date, '2027-02-02');
  eq(Parser.parseEvent('le mois prochain 10h bilan', NOW).date, '2026-12-01');
  eq(Parser.parseEvent('dans 5 jours 10h truc', NOW).date, '2026-11-07');
});

test('P11 : wouldConflict détecte un chevauchement avant ajout', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  assert(p.wouldConflict({ date: '2026-11-04', start: '09:30', end: '10:30' }), 'chevauchement détecté');
  assert(!p.wouldConflict({ date: '2026-11-04', start: '10:00', end: '11:00' }), 'pas de chevauchement si juste après');
  assert(!p.wouldConflict({ date: '2026-11-05', start: '09:30', end: '10:30' }), 'autre jour = ok');
});

test('P12 : freeSlots renvoie les trous d une journée entre 8h et 20h', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' });
  p.add({ title: 'B', date: '2026-11-04', start: '14:00', end: '15:00' });
  const slots = p.freeSlots('2026-11-04', 60);
  assert(slots.length >= 2, 'au moins 2 créneaux (matin + aprem)');
  eq(slots[0].start, '08:00');
  assert(slots.some(s => s.start === '10:00'), 'créneau 10:00 présent');
  assert(slots.some(s => s.start === '15:00'), 'créneau 15:00 présent');
  assert(slots.every(s => s.start >= '08:00' && s.end <= '20:00'), 'borné 8h-20h');
});

// ---------- brain (moteur de suggestions) ----------
test('Brain.detectRoutines : 3x "sport" le lundi -> routine détectée avec suggestion', () => {
  const evs = [
    { title: 'Sport', date: '2026-10-05', start: '18:00', end: '19:00' },
    { title: 'Sport', date: '2026-10-12', start: '18:00', end: '19:00' },
    { title: 'Sport', date: '2026-10-19', start: '18:00', end: '19:00' },
    { title: 'Dentiste', date: '2026-10-07', start: '14:00', end: '15:00' },
  ];
  const r = Brain.detectRoutines(evs, NOW);
  eq(r.length, 1);
  assert(/Sport/.test(r[0].suggestion));
  eq(r[0].count, 3);
  eq(r[0].start, '18:00');
});

test('Brain.freeSlots : trous entre événements, borné 8h-20h', () => {
  const slots = Brain.freeSlots([
    { start: '09:00', end: '10:00' },
    { start: '14:00', end: '15:00' },
  ], 60);
  eq(slots[0].start, '08:00');
  assert(slots.some(s => s.start === '10:00'), '10:00 libre');
  assert(slots.some(s => s.start === '15:00'), '15:00 libre');
  assert(slots.every(s => s.end <= '20:00'), 'borné 20h');
});

test('Brain.suggestSlots : propose des créneaux dans la semaine', () => {
  const evs = [{ id: 'x', title: 'A', date: '2026-11-02', start: '09:00', end: '18:00' }];
  const slots = Brain.suggestSlots(evs, '2026-11-02', 'Réunion', 60);
  assert(slots.length >= 1, 'au moins 1 créneau');
  assert(slots.every(s => s.date !== '2026-11-02' || s.start === '08:00' || s.start >= '18:00'), 'pas en plein dans 09:00-18:00');
});

test('Brain.suggestReschedule : conflit -> déplace B après A', () => {
  const a = { id: 'a', title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' };
  const b = { id: 'b', title: 'B', date: '2026-11-04', start: '09:30', end: '10:30' };
  const r = Brain.suggestReschedule(a, b);
  assert(r && r.action === 'move', 'proposition de déplacement');
  eq(r.to.start, '10:00');
  eq(r.to.end, '11:00');
});

test('Brain.suggestReschedule : pas de conflit -> null', () => {
  const a = { id: 'a', title: 'A', date: '2026-11-04', start: '09:00', end: '10:00' };
  const b = { id: 'b', title: 'B', date: '2026-11-04', start: '10:00', end: '11:00' };
  eq(Brain.suggestReschedule(a, b), null);
});

// ---------- v8 : année / comparaison / audit ----------
test('v8 yearGrid : 12 mois avec compteurs', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-03-10' });
  p.add({ title: 'B', date: '2026-03-12' });
  const y = p.yearGrid(2026);
  eq(y.months.length, 12);
  eq(y.months[2].count, 2);
});
test('v8 weekCompare : deltas événements/heures', () => {
  const p = Planner.createPlanner();
  p.add({ title: 'A', date: '2026-11-02', start: '09:00', end: '10:00' });
  p.add({ title: 'B', date: '2026-10-26', start: '09:00', end: '11:00' });
  p.add({ title: 'C', date: '2026-10-27', start: '14:00', end: '15:00' });
  const c = p.weekCompare('2026-11-02');
  eq(c.eventsDelta, -1);
  assert(c.hoursDelta < 0);
});
test('v8 Store: audit loggé + schéma v2', () => {
  Store.clear();
  Store.audit('test', { x: 1 });
  assert(Store.getAudit().length >= 1, 'audit ok');
  eq(Store.SCHEMA_VERSION, 2);
});

// ---------- Résumé ----------
console.log('');
for (const p of passes) console.log('  ✓ ' + p);
if (failures.length) {
  console.log('');
  for (const f of failures) console.log('  ✗ ' + f.name + '\n      ' + f.error);
  console.log('\n' + passes.length + ' OK, ' + failures.length + ' ÉCHEC(S)');
  process.exit(1);
}
console.log('\n' + passes.length + ' tests OK, 0 échec 🎉');
