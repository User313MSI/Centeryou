import type { Category, Priority } from '../types';
import { WEEKDAY_NAMES, addDaysISO, nextWeekdayISO, timeOf, todayISO } from './dates';
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

const CATEGORY_WORDS: Record<string, Category> = {
  sante: 'sante',
  travail: 'travail',
  perso: 'perso',
  focus: 'focus',
};

const WEEKDAY_IDX: Record<string, number> = Object.fromEntries(
  WEEKDAY_NAMES.map((name, idx) => [name, idx]),
);

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
export function parseInput(raw: string, today: string = todayISO()): ParsedInput {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const norm = tokens.map((t) => normalizeText(t));

  let priority: Priority = 'moyenne';
  let time: string | null = null;
  let date: string | null = null;
  let category: Category | null = null;
  const titleWords: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    let t = norm[i];

    if (t.startsWith('!')) {
      priority = 'haute';
      t = t.slice(1);
      if (!t) continue;
    }

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
      continue;
    }
    if (t === 'demain') {
      date = addDaysISO(today, 1);
      continue;
    }
    if (t === 'apres-demain' || (t === 'apres' && norm[i + 1] === 'demain')) {
      date = addDaysISO(today, 2);
      if (t === 'apres') i += 1;
      continue;
    }
    if (t === 'ce' && norm[i + 1] === 'soir') {
      date = today;
      if (!time) time = '19:00';
      i += 1;
      continue;
    }
    if (t in WEEKDAY_IDX) {
      date = nextWeekdayISO(WEEKDAY_IDX[t], today);
      continue;
    }
    if (t === 'dans' && /^\d+$/.test(norm[i + 1] ?? '')) {
      const n = Number(norm[i + 1]);
      const unit = norm[i + 2] ?? '';
      if (unit === 'jour' || unit === 'jours') {
        date = addDaysISO(today, n);
        i += 2;
        continue;
      }
      if (unit === 'semaine' || unit === 'semaines' || unit === 'sem') {
        date = addDaysISO(today, n * 7);
        i += 2;
        continue;
      }
    }

    if (t in CATEGORY_WORDS) {
      category = CATEGORY_WORDS[t];
      continue;
    }

    // « à 14h » : on ignore le « à » collé à une heure
    if (t === 'a' && norm[i + 1] && isTimeToken(norm[i + 1])) {
      continue;
    }

    titleWords.push(tokens[i]);
  }

  let title = titleWords.join(' ').trim();
  if (!title) title = 'Nouvelle tâche';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title,
    date: date ?? today,
    time,
    category: category ?? 'autre',
    priority,
  };
}
