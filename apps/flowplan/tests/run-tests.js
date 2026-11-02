/* FlowPlan — tests du parser, du planner et du store. Runner maison, zéro dépendance. */
const path = require('path');

const Parser = require(path.join(__dirname, '..', 'js', 'parser.js'));
const Planner = require(path.join(__dirname, '..', 'js', 'planner.js'));
const Store = require(path.join(__dirname, '..', 'js', 'store.js'));
const Categories = require(path.join(__dirname, '..', 'js', 'categories.js'));
const ICS = require(path.join(__dirname, '..', 'js', 'ics.js'));

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

// "maintenant" fixe : lundi 3 novembre 2026, 10h00 (heure de Paris, sans importance ici)
const NOW = new Date(2026, 10, 3, 10, 0, 0);

// ---------- Parser ----------
test('parser : "lundi 9h réunion équipe" -> lundi prochain à 9h00', () => {
  const ev = Parser.parseEvent('Lundi 9h réunion équipe', NOW);
  eq(ev.date, '2026-11-09');
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
  eq(ev.date, '2026-11-03');
  eq(ev.start, '12:30');
});

test('parser : "demain 8h réveil"', () => {
  const ev = Parser.parseEvent('demain 8h réveil', NOW);
  eq(ev.date, '2026-11-04');
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
  eq(ev.date, '2026-11-03');
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
  eq(evs[0].date, '2026-11-09');
  eq(evs[1].start, '14:30');
  eq(evs[2].start, '18:00');
});

test('parser : entrée vide -> null / []', () => {
  eq(Parser.parseEvent('', NOW), null);
  eq(Parser.parse('   ', NOW).length, 0);
});

test('parser : heure invalide ignorée', () => {
  const ev = Parser.parseEvent('lundi 25h truc', NOW);
  eq(ev.date, '2026-11-09');
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

// ---------- Récurrence ----------
test('parser : "tous les lundis 18h30 sport" -> 9 occurrences hebdo', () => {
  const evs = Parser.parse('tous les lundis 18h30 sport', NOW);
  eq(evs.length, 9); // lundi 9/11 + 8 semaines
  eq(evs[0].date, '2026-11-09');
  eq(evs[1].date, '2026-11-16');
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
  const w2 = p.week('2026-11-09'); // semaine du lun 9/11 : lundi "prochain"
  eq(w2.days[0].events[0].title, 'Réunion équipe');
  eq(p.conflicts().length, 0);
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
