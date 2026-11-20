/**
 * Test du parseur français (lib/parser.ts) — aucune bibliothèque externe.
 * Compile les libs TS avec le tsc du projet vers /tmp puis exécute les assertions.
 * Usage : npm run test:parser
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const outDir = path.join(appRoot, '.test-build');

// On appelle le tsc local du projet via l'exécutable Node courant : fonctionne
// partout (Windows inclus), là où `spawnSync('npx', …)` échoue (npx = npx.cmd
// introuvable sans shell sous Windows).
const tscBin = path.join(appRoot, 'node_modules', 'typescript', 'bin', 'tsc');

execFileSync(
  process.execPath,
  [
    tscBin,
    'src/lib/dates.ts',
    'src/lib/utils.ts',
    'src/lib/parser.ts',
    'src/lib/events.ts',
    'src/lib/store.ts',
    'src/lib/ui-store.ts',
    'src/lib/voice.ts',
    'src/lib/voice-commands.ts',
    '--outDir', outDir,
    '--rootDir', '.',
    '--module', 'commonjs',
    '--target', 'es2020',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  { cwd: appRoot, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const { parseInput } = require(path.join(outDir, 'src/lib/parser.js'));
const { eventsOnDate, findConflict, calendarOnDate, calendarMonthOnDate } = require(path.join(outDir, 'src/lib/events.js'));
const { useStore } = require(path.join(outDir, 'src/lib/store.js'));
const { handleVoiceCommand } = require(path.join(outDir, 'src/lib/voice-commands.js'));
const { todayISO, addDaysISO } = require(path.join(outDir, 'src/lib/dates.js'));

// lundi 6 janvier 2025
const TODAY = '2025-01-06';

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.log(`  ❌ ${name}\n     attendu: ${e}\n     obtenu:  ${a}`);
  }
}

console.log('Parseur — exemples du cahier des charges :');
check('« sport demain 14h »', parseInput('sport demain 14h', TODAY), {
  title: 'Sport', date: '2025-01-07', time: '14:00', category: 'autre', priority: 'moyenne',
});
check('« dentist mardi 10h30 santé »', parseInput('dentist mardi 10h30 santé', TODAY), {
  title: 'Dentist', date: '2025-01-07', time: '10:30', category: 'sante', priority: 'moyenne',
});
check('« rapport vendredi »', parseInput('rapport vendredi', TODAY), {
  title: 'Rapport', date: '2025-01-10', time: null, category: 'autre', priority: 'moyenne',
});
check('« !lundi réunion »', parseInput('!lundi réunion', TODAY), {
  title: 'Réunion', date: '2025-01-06', time: null, category: 'autre', priority: 'haute',
});

console.log('Parseur — cas supplémentaires :');
check('tâche simple (aucun indice)', parseInput('courses', TODAY).date, TODAY);
check('tâche simple sans heure', parseInput('courses', TODAY).time, null);
check('aujourd’hui 18h30', parseInput("sport aujourd'hui 18h30", TODAY), {
  title: 'Sport', date: '2025-01-06', time: '18:30', category: 'autre', priority: 'moyenne',
});
check('travail jeudi 9h', parseInput('réunion travail jeudi 9h', TODAY), {
  title: 'Réunion', date: '2025-01-09', time: '09:00', category: 'travail', priority: 'moyenne',
});
check('après-demain', parseInput('ménage après-demain', TODAY).date, '2025-01-08');
check('dans 3 jours', parseInput('appel dans 3 jours', TODAY).date, '2025-01-09');
check('dans 2 semaines', parseInput('récap dans 2 semaines', TODAY).date, '2025-01-20');
// M-08 : plus de date NaN — au-delà du plafond, le texte reste dans le titre et la date reste valide
check('« dans 999999999 jours » → date du jour (valide) + texte dans le titre', parseInput('dans 999999999 jours', TODAY), {
  title: 'Dans 999999999 jours', date: TODAY, time: null, category: 'autre', priority: 'moyenne',
});
check('« dans 501 jours » → reste dans le titre, date du jour', parseInput('sport dans 501 jours', TODAY).date, TODAY);
check('« dans 500 jours » → date calculée normalement', parseInput('sport dans 500 jours', TODAY).date, addDaysISO(TODAY, 500));
check('focus + heure avec « à »', parseInput('deep work focus à 15h', TODAY), {
  title: 'Deep work', date: '2025-01-06', time: '15:00', category: 'focus', priority: 'moyenne',
});
check('midi', parseInput('déjeuner midi', TODAY).time, '12:00');
check('entrée vide = tâche du jour', parseInput('   ', TODAY), {
  title: 'Nouvelle tâche', date: TODAY, time: null, category: 'autre', priority: 'moyenne',
});

console.log('Conflits d’événements :');
const base = { id: 'e1', title: 'Réunion', date: '2025-01-06', start: '10:00', end: '11:00', category: 'travail', repeat: 'jamais', createdAt: 1 };
check('doublon exact détecté', findConflict([base], { date: '2025-01-06', start: '10:00', end: '11:00' })?.exact, true);
check('chevauchement partiel détecté', findConflict([base], { date: '2025-01-06', start: '10:30', end: '11:30' })?.exact, false);
check('créneau libre = pas de conflit', findConflict([base], { date: '2025-01-06', start: '11:00', end: '12:00' }), null);
check('même heure, autre jour = pas de conflit', findConflict([base], { date: '2025-01-07', start: '10:00', end: '11:00' }), null);
check('répétition quotidienne couvre demain', eventsOnDate([{ ...base, repeat: 'jour' }], '2025-01-07').length, 1);
check('répétition hebdomadaire même jour de semaine', eventsOnDate([{ ...base, repeat: 'semaine' }], '2025-01-13').length, 1);
check('répétition hebdomadaire autre jour', eventsOnDate([{ ...base, repeat: 'semaine' }], '2025-01-08').length, 0);
// M-08 : « chaque mois » sur un 31 = clamp au dernier jour du mois (comme addMonthsISO)
check('répétition mensuelle sur un 31 : présente le 28 février', eventsOnDate([{ ...base, date: '2025-01-31', repeat: 'mois' }], '2025-02-28').length, 1);
check('répétition mensuelle sur un 31 : présente le 30 avril', eventsOnDate([{ ...base, date: '2025-01-31', repeat: 'mois' }], '2025-04-30').length, 1);
check('répétition mensuelle sur un 29/02 bissextile : présente le 28 février suivant', eventsOnDate([{ ...base, date: '2024-02-29', repeat: 'mois' }], '2025-02-28').length, 1);

console.log('Éléments calendrier (événements + tâches) :');
const taskSport = { id: 't1', title: 'Sport', date: '2025-01-07', time: '14:00', category: 'perso', priority: 'moyenne', done: false, createdAt: 2 };
const taskSansHeure = { id: 't2', title: 'Rapport', date: '2025-01-10', time: null, category: 'autre', priority: 'moyenne', done: false, createdAt: 3 };
const allTasks = [taskSport, taskSansHeure];
const base7 = { ...base, id: 'e7', date: '2025-01-07' };
check('tâche avec heure positionnée en Jour/Semaine', calendarOnDate([base7], allTasks, '2025-01-07').map((i) => `${i.kind}:${i.title}@${i.start}`), ['event:Réunion@10:00', 'task:Sport@14:00']);
check('tâche sans heure absente de la grille horaire', calendarOnDate([], allTasks, '2025-01-10').map((i) => i.title), []);
check('mois : tâche sans heure visible à sa date', calendarMonthOnDate([], allTasks, '2025-01-10').map((i) => `${i.kind}:${i.title}`), ['task:Rapport']);
check('mois : tâche avec heure aussi visible', calendarMonthOnDate([], allTasks, '2025-01-07').map((i) => `${i.kind}:${i.title}`), ['task:Sport']);
check('aucun élément ailleurs', calendarOnDate([base7], allTasks, '2025-01-08').length, 0);

console.log('Commandes vocales (sans clé API, voix désactivée pour le test) :');
useStore.setState({
  events: [],
  tasks: [],
  settings: { ...useStore.getState().settings, voice: false, sounds: false },
});
const replyAdd = await handleVoiceCommand('ajoute sport demain 14h');
const evAfter = useStore.getState().events.map((e) => ({ title: e.title, date: e.date, start: e.start, end: e.end }));
check('« ajoute sport demain 14h » crée l’événement et confirme', { reply: replyAdd, ev: evAfter }, {
  reply: `Ajouté : Sport, demain à 14h00.`,
  ev: [{ title: 'Sport', date: addDaysISO(todayISO(), 1), start: '14:00', end: '15:00' }],
});
const replyToday = await handleVoiceCommand("que dois-je faire aujourd'hui ?");
check('jour vide = message gentil', replyToday.includes('libre'), true);
useStore.getState().addTask({ title: 'Sport', date: todayISO(), time: null, category: 'autre', priority: 'moyenne' });
const replyDone = await handleVoiceCommand("c'est fait sport");
check('« c’est fait sport » coche la tâche et répond Bravo', {
  reply: replyDone,
  done: useStore.getState().tasks[0].done,
}, { reply: 'Bravo ! « Sport » est cochée.', done: true });
const replyTomorrow = await handleVoiceCommand('quoi de prévu demain ?');
check('« quoi de prévu demain ? » lit le programme de demain', replyTomorrow.includes('demain') && replyTomorrow.includes('Sport à 14h00'), true);
const replyUnknown = await handleVoiceCommand('blabla incompris');
check('commande inconnue = suggestion douce', replyUnknown.includes("Je n’ai pas compris"), true);

if (failures > 0) {
  console.log(`\n${failures} test(s) en échec`);
  process.exit(1);
}
console.log('\nTous les tests passent ✅');
