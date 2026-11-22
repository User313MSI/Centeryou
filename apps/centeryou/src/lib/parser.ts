import type { Category, Priority } from '../types';
import { WEEKDAY_NAMES, addDaysISO, nextWeekdayISO, parseISO, timeOf, todayISO } from './dates';
import { normalizeText } from './utils';

export interface ParsedInput {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm ou null */
  time: string | null;
  category: Category;
  priority: Priority;
}

/**
 * M-19 — détail exposé pour la voix : une date ou une heure a-t-elle été
 * RECONNUES dans la phrase ? `parseInput` garde exactement la même forme
 * (5 champs), seul `parseInputDetailed` porte ces deux drapeaux.
 */
export interface ParsedInputDetails extends ParsedInput {
  /** une référence de date explicite a été reconnue (aujourd’hui, demain, jour de semaine, « dans N jours », « ce soir »…) */
  hasDate: boolean;
  /** une heure a été reconnue (14h, 14:30, midi, minuit, « ce soir » → 19:00) */
  hasTime: boolean;
}

const CATEGORY_WORDS: Record<string, Category> = {
  sante: 'sante',
  travail: 'travail',
  perso: 'perso',
  focus: 'focus',
};

const WEEKDAY_IDX: Record<string, number> = Object.fromEntries(
  WEEKDAY_NAMES.map((name, idx) => [name, idx]),
);

/**
 * Plafond de la saisie relative « dans N jours/semaines » (M-08) : au-delà, les
 * mots restent simplement dans le titre et la date reste valide (jamais de date
 * NaN, donc jamais de crash Intl — ex. « dans 999999999 jours »).
 */
const MAX_RELATIVE_UNITS = 500;

/** true si la chaîne est une date ISO YYYY-MM-DD réellement valide (pas NaN). */
function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return !Number.isNaN(parseISO(iso).getTime());
}

/**
 * M-19 — mots de remplissage en tête de phrase (formes normalisées, sans accents).
 * Retirés du titre pour ne garder que le cœur de la phrase :
 * « écris-moi que », « note que », « ajoute », « mets », « rappelle-moi »…
 * Triés du plus long au plus court pour un appariement glouton.
 */
const LEAD_FILLERS: string[][] = [
  ['ecris', 'moi', 'que'],
  ['ecris-moi', 'que'],
  ['dis', 'moi', 'que'],
  ['dis-moi', 'que'],
  ['rappelle', 'moi', 'que'],
  ['rappelle-moi', 'que'],
  ['note', 'que'],
  ['ecris', 'moi'],
  ['ecris-moi'],
  ['rappelle', 'moi'],
  ['rappelle-moi'],
  ['ajoute'],
  ['mets'],
  ['met'],
];

/**
 * M-19 — masque des tokens à ignorer pour le titre :
 * « j’ai » (normalisé « jai ») disparaît partout dans la phrase, l’article
 * « un »/« une » qui le suit disparaît avec, les remplissages de tête et
 * l’article « un »/« une » en tête du cœur de phrase sont retirés.
 */
function fillerSkipMask(norm: string[]): boolean[] {
  const n = norm.length;
  const skip = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i += 1) {
    if (norm[i] === 'jai') skip[i] = true;
  }
  // « j’ai un stream » -> « stream » : l’article collé à « j’ai » part avec
  for (let i = 1; i < n; i += 1) {
    if (skip[i - 1] && norm[i - 1] === 'jai' && (norm[i] === 'un' || norm[i] === 'une')) skip[i] = true;
  }
  const open = (): number[] => {
    const idx: number[] = [];
    for (let i = 0; i < n; i += 1) if (!skip[i]) idx.push(i);
    return idx;
  };
  // remplissage en tête (tant qu’un motif colle au début des tokens restants)
  let progress = true;
  while (progress) {
    progress = false;
    const idx = open();
    for (const pat of LEAD_FILLERS) {
      if (pat.length <= idx.length && pat.every((p, k) => norm[idx[k]] === p)) {
        for (let k = 0; k < pat.length; k += 1) skip[idx[k]] = true;
        progress = true;
        break;
      }
    }
  }
  // article « un » / « une » en tête du cœur de phrase (tant qu’il reste un mot après)
  let idx = open();
  while (idx.length > 1 && (norm[idx[0]] === 'un' || norm[idx[0]] === 'une')) {
    skip[idx[0]] = true;
    idx = open();
  }
  return skip;
}

/**
 * M-22 — USINE À TITRES UNIQUE (Plume).
 *
 * Une seule fonction, `cleanTitle`, fabrique le titre final à partir du texte
 * restant une fois dates / heures / catégories consommées. Elle est appelée
 * par `parseInputDetailed`, donc par `parseInput` (saisie rapide clavier) ET
 * par la commande vocale — les mêmes règles partout, aucun doublon de logique.
 */

/** Longueur max d’un titre : au-delà, troncature propre au dernier mot complet (~40 caractères). */
export const TITRE_MAX = 40;

/** Titre de repli si tout a été nettoyé : jamais un mur vide. */
export const TITRE_REPLI = 'Nouvelle tâche';

/**
 * M-22 — lexique FR de bavardage et d’auto-correction (formes normalisées :
 * minuscules, sans accents, apostrophes retirées, traits d’union conservés).
 * Motifs les plus longs d’abord : « je veux dire », « c’est-à-dire », « du coup »…
 * + hésitations (euh, bah, hum, hein…) et corrections (non, justement, plutôt…).
 */
export const LEXIQUE_BAVARDAGE: string[][] = [
  ['je', 'voulais', 'dire'],
  ['je', 'veux', 'dire'],
  ['cest', 'a', 'dire'],
  ['plutot', 'que'],
  ['disons', 'que'],
  ['en', 'realite'],
  ['en', 'fait'],
  ['du', 'coup'],
  ['en', 'vrai'],
  ['cest-a-dire'],
  ['euh-euh'],
  ['finalement'],
  ['justement'],
  ['euhh'],
  ['euuh'],
  ['euhm'],
  ['disons'],
  ['plutot'],
  ['attends'],
  ['voila'],
  ['hein'],
  ['cest'],
  ['euh'],
  ['bah'],
  ['ben'],
  ['heu'],
  ['hum'],
  ['mmh'],
  ['mmm'],
  ['ah'],
  ['oh'],
  ['hm'],
  ['non'],
  ['enfin'],
  ['bref'],
];

/**
 * M-22 — mots de liaison qui ne doivent jamais rester seuls (orphelins) en
 * début, fin ou milieu de titre : le, la, les, de, à (a), que, pour.
 * Ils ne partent qu’en bordure ou collés à un mot du lexique retiré :
 * au milieu d’une activité ils restent (« laver la voiture », « salle de sport »).
 */
const MOTS_LIAISON_ORPHELINS = new Set(['le', 'la', 'les', 'de', 'a', 'que', 'pour']);

/**
 * Normalise un token pour la comparaison : comme `normalizeText`, plus la
 * ponctuation retirée (sauf « ! » initial des priorités et « : » des heures),
 * pour que « aujourd’hui, » ou « 14h, » soient reconnus malgré la virgule.
 */
function normToken(t: string): string {
  const n = normalizeText(t);
  const bang = n.startsWith('!') ? '!' : '';
  // ES5 : pas de flag /u — l'entrée est déjà normalisée (a-z0-9 + ':' des heures + '-')
  return bang + n.replace(/[^a-z0-9:-]+/g, '');
}

/**
 * M-22 — L’USINE À TITRES, unique et partagée clavier + voix.
 * Reçoit le texte restant (déjà débarrassé des dates/heures reconnues) et rend
 * un titre propre et court :
 *  - bavardage / auto-correction retirés (LEXIQUE_BAVARDAGE, plus « quoi » final),
 *  - jamais de mot de liaison orphelin en début / fin / milieu,
 *  - jamais de date ni d’heure dans le titre (consommées avant, dans parseInputDetailed),
 *  - troncature propre à TITRE_MAX caractères au dernier mot complet, sans « … »,
 *  - majuscule initiale, et repli TITRE_REPLI si le nettoyage a tout vidé.
 */
export function cleanTitle(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return TITRE_REPLI;
  const norm = words.map(normToken);
  const skip = new Array<boolean>(words.length).fill(false);

  // 1) lexique de bavardage / auto-correction, n’importe où (motifs longs d’abord)
  const motifs = [...LEXIQUE_BAVARDAGE].sort((a, b) => b.length - a.length);
  for (let i = 0; i < norm.length; i += 1) {
    if (skip[i]) continue;
    for (const pat of motifs) {
      if (pat.length <= norm.length - i && pat.every((p, k) => norm[i + k] === p)) {
        for (let k = 0; k < pat.length; k += 1) skip[i + k] = true;
        break;
      }
    }
  }
  // « quoi » de fin de phrase
  if (!skip[norm.length - 1] && norm[norm.length - 1] === 'quoi') skip[norm.length - 1] = true;

  // 2) un mot de liaison collé à un mot retiré part avec (orphelin de milieu)
  for (let i = 0; i < norm.length; i += 1) {
    if (!skip[i]) continue;
    if (i > 0 && MOTS_LIAISON_ORPHELINS.has(norm[i - 1])) skip[i - 1] = true;
    if (i < norm.length - 1 && MOTS_LIAISON_ORPHELINS.has(norm[i + 1])) skip[i + 1] = true;
  }

  // 3) jamais de mot de liaison orphelin en début ni en fin de titre
  let first = 0;
  let last = words.length - 1;
  while (first <= last && skip[first]) first += 1;
  while (last >= first && skip[last]) last -= 1;
  while (first <= last && MOTS_LIAISON_ORPHELINS.has(norm[first])) { skip[first] = true; first += 1; }
  while (last >= first && MOTS_LIAISON_ORPHELINS.has(norm[last])) { skip[last] = true; last -= 1; }

  const kept = words.filter((_, i) => !skip[i]);
  let title = kept.join(' ').replace(/\s+/g, ' ').trim();
  // ponctuation de bordure (guillemets, virgule finale…) ; « ! » initial conservé
  // ES5 : pas de flag /u — classes explicites (lettres accentuées FR incluses)
  title = title.replace(/^[^a-zA-Z0-9À-ÿŒœ!]+/, '').replace(/[^a-zA-Z0-9À-ÿŒœ]+$/, '').trim();

  // 4) troncature propre à ~TITRE_MAX caractères, au dernier mot complet, sans « … »
  if (title.length > TITRE_MAX) {
    let t = '';
    for (const w of kept) {
      const next = t ? `${t} ${w}` : w;
      if (next.length > TITRE_MAX) break;
      t = next;
    }
    if (!t && kept.length > 0) t = kept[0].slice(0, TITRE_MAX); // un seul mot trop long : coupe sèche
    // re-nettoie les bords après troncature (un mot de liaison ne doit pas finir le titre)
    const parts = t.split(' ').filter(Boolean);
    while (parts.length > 0 && MOTS_LIAISON_ORPHELINS.has(normToken(parts[parts.length - 1]))) parts.pop();
    while (parts.length > 0 && MOTS_LIAISON_ORPHELINS.has(normToken(parts[0]))) parts.shift();
    title = parts.join(' ').trim();
  }

  if (!title) return TITRE_REPLI;
  // 5) majuscule initiale
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function isTimeToken(t: string): boolean {
  return /^(\d{1,2})h(\d{2})$/.test(t) || /^(\d{1,2})h$/.test(t) || /^(\d{1,2}):(\d{2})$/.test(t);
}

function parseTimeToken(t: string): string | null {
  let m = t.match(/^(\d{1,2})h(\d{2})$/);
  if (!m) m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h <= 23 && min <= 59) return timeOf(h * 60 + min);
    return null;
  }
  if (/^(\d{1,2})h$/.test(t)) {
    const h = Number(t.slice(0, -1));
    if (h <= 23) return timeOf(h * 60);
  }
  return null;
}

/**
 * Parseur de saisie rapide, écrit maison, en français.
 * Exemples :
 *  - « sport demain 14h »        -> sport, demain, 14:00
 *  - « dentist mardi 10h30 santé » -> dentist, mardi, 10:30, catégorie Santé
 *  - « rapport vendredi »        -> rapport, vendredi, sans heure
 *  - « !lundi réunion »          -> priorité Haute, lundi, réunion
 * Au moindre doute : tâche simple aujourd'hui.
 */
export function parseInputDetailed(raw: string, today: string = todayISO()): ParsedInputDetails {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  // M-22 : ponctuation tolérée dans les jetons (« aujourd’hui, », « 14h, »)
const norm = tokens.map((t) => normToken(t));

  // M-19 : mots de remplissage retirés du titre (« écris-moi que », « j’ai », « un » en tête…)
  const skip = fillerSkipMask(norm);
  // M-19 : une heure explicite existe-t-elle dans la phrase ? Si oui, « soir »/« matin »
  // ne restent pas dans le titre (« demain soir 21h » -> 21:00, titre sans « soir »).
  const hasExplicitTime = norm.some((t) => isTimeToken(t) || t === 'midi' || t === 'minuit');

  let priority: Priority = 'moyenne';
  let time: string | null = null;
  let date: string | null = null;
  let hasDate = false;
  let category: Category | null = null;
  const titleWords: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    let t = norm[i];

    if (t.startsWith('!')) {
      priority = 'haute';
      t = t.slice(1);
      if (!t) continue;
    }
    if (skip[i]) continue;

    const asTime = parseTimeToken(t);
    if (asTime) {
      time = asTime;
      continue;
    }
    if (t === 'midi') {
      time = '12:00';
      continue;
    }
    if (t === 'minuit') {
      time = '00:00';
      continue;
    }

    if (t === 'aujourdhui') {
      date = today;
      hasDate = true;
      continue;
    }
    if (t === 'demain') {
      date = addDaysISO(today, 1);
      hasDate = true;
      continue;
    }
    if (t === 'apres-demain' || (t === 'apres' && norm[i + 1] === 'demain')) {
      date = addDaysISO(today, 2);
      hasDate = true;
      if (t === 'apres') i += 1;
      continue;
    }
    if (t === 'ce' && norm[i + 1] === 'soir') {
      date = today;
      hasDate = true;
      if (!time) time = '19:00';
      i += 1;
      continue;
    }
    if (t === 'ce' && norm[i + 1] === 'matin') {
      // « ce matin » = aujourd’hui, mais aucune heure inventée
      date = today;
      hasDate = true;
      i += 1;
      continue;
    }
    if (t in WEEKDAY_IDX) {
      date = nextWeekdayISO(WEEKDAY_IDX[t], today);
      hasDate = true;
      continue;
    }
    if (t === 'dans' && /^\d+$/.test(norm[i + 1] ?? '')) {
      const n = Number(norm[i + 1]);
      const unit = norm[i + 2] ?? '';
      const isDays = unit === 'jour' || unit === 'jours';
      const isWeeks = unit === 'semaine' || unit === 'semaines' || unit === 'sem';
      // quantité plafonnée + date produite toujours valide : sinon les mots restent
      // dans le titre (date inchangée), comme pour toute saisie non reconnue
      if ((isDays || isWeeks) && Number.isFinite(n) && n <= MAX_RELATIVE_UNITS) {
        const candidate = addDaysISO(today, isDays ? n : n * 7);
        if (isValidISODate(candidate)) {
          date = candidate;
          hasDate = true;
          i += 2;
          continue;
        }
      }
    }

    if (t in CATEGORY_WORDS) {
      category = CATEGORY_WORDS[t];
      continue;
    }

    // « soir »/« matin » seuls : retirés du titre quand une heure explicite est donnée
    // (« demain soir 21h »), sinon ils restent dans le titre (« dîner demain soir »)
    if (hasExplicitTime && (t === 'soir' || t === 'matin')) {
      continue;
    }

    // « à 14h », « à 14:30 », « à midi » : on ignore le « à » collé à une heure
    if (t === 'a' && norm[i + 1] && (isTimeToken(norm[i + 1]) || norm[i + 1] === 'midi' || norm[i + 1] === 'minuit')) {
      continue;
    }

    titleWords.push(tokens[i]);
  }

  // M-22 : une seule usine à titres, partagée par la saisie rapide clavier et la voix
  const title = cleanTitle(titleWords.join(' '));

  return {
    title,
    date: date ?? today,
    time,
    category: category ?? 'autre',
    priority,
    hasDate,
    hasTime: time !== null,
  };
}

/**
 * Parseur de saisie rapide — même analyse que `parseInputDetailed`,
 * forme historique à 5 champs inchangée.
 */
export function parseInput(raw: string, today: string = todayISO()): ParsedInput {
  const d = parseInputDetailed(raw, today);
  return {
    title: d.title,
    date: d.date,
    time: d.time,
    category: d.category,
    priority: d.priority,
  };
}
