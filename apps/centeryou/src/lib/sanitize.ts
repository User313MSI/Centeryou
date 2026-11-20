import type { Category, EventItem, Priority, Repeat, Settings, TaskItem } from '../types';
import { defaultSettings } from './defaults';

import { isReminderLead } from './rappel-leads';

const CATEGORIES: Category[] = ['travail', 'perso', 'sante', 'focus', 'autre'];
const PRIORITIES: Priority[] = ['basse', 'moyenne', 'haute'];
const REPEATS: Repeat[] = ['jamais', 'jour', 'semaine', 'mois'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^\d{2}:\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Garde uniquement les événements bien formés — réparation douce, aucune perte des éléments valides. */
export function sanitizeEvents(input: unknown): EventItem[] {
  if (!Array.isArray(input)) return [];
  const out: EventItem[] = [];
  for (const v of input) {
    if (!isRecord(v)) continue;
    const id = asString(v.id);
    const title = asString(v.title);
    const date = asString(v.date);
    const start = asString(v.start);
    const end = asString(v.end);
    if (!id || !title || !date || !start || !end) continue;
    if (!ISO_DATE.test(date) || !HH_MM.test(start) || !HH_MM.test(end)) continue;
    if (!CATEGORIES.includes(v.category as Category)) continue;
    if (!REPEATS.includes(v.repeat as Repeat)) continue;
    const ev: EventItem = {
      id,
      title,
      date,
      start,
      end,
      category: v.category as Category,
      repeat: v.repeat as Repeat,
      createdAt: typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : Date.now(),
    };
    // rappel (M-04) : champ optionnel — absent on le laisse absent (données d'avant M-04),
    // présent mais invalide on le répare en « pas de rappel » (null)
    if (v.reminderMinutes !== undefined) ev.reminderMinutes = isReminderLead(v.reminderMinutes) ? v.reminderMinutes : null;
    out.push(ev);
  }
  return out;
}

/** Garde uniquement les tâches bien formées. */
export function sanitizeTasks(input: unknown): TaskItem[] {
  if (!Array.isArray(input)) return [];
  const out: TaskItem[] = [];
  for (const v of input) {
    if (!isRecord(v)) continue;
    const id = asString(v.id);
    const title = asString(v.title);
    const date = asString(v.date);
    if (!id || !title || !date || !ISO_DATE.test(date)) continue;
    if (!CATEGORIES.includes(v.category as Category)) continue;
    if (!PRIORITIES.includes(v.priority as Priority)) continue;
    const time = asString(v.time);
    if (time !== null && !HH_MM.test(time)) continue;
    out.push({
      id,
      title,
      date,
      time,
      category: v.category as Category,
      priority: v.priority as Priority,
      done: v.done === true,
      createdAt: typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) ? v.createdAt : Date.now(),
    });
  }
  return out;
}

/** Complète les réglages manquants avec les valeurs par défaut (jamais de champ undefined). */
export function sanitizeSettings(input: unknown): Settings {
  const base = { ...defaultSettings };
  if (!isRecord(input)) return base;
  if (typeof input.prenom === 'string') base.prenom = input.prenom;
  if (typeof input.dayStart === 'number' && Number.isFinite(input.dayStart)) base.dayStart = Math.min(10, Math.max(6, input.dayStart));
  if (typeof input.sounds === 'boolean') base.sounds = input.sounds;
  if (typeof input.voice === 'boolean') base.voice = input.voice;
  if (typeof input.briefShownDate === 'string') base.briefShownDate = input.briefShownDate;
  if (input.welcomeSequence === 'always' || input.welcomeSequence === 'daily' || input.welcomeSequence === 'off') {
    base.welcomeSequence = input.welcomeSequence;
  }
  if (typeof input.welcomeShownDate === 'string') base.welcomeShownDate = input.welcomeShownDate;
  // champs ajoutés ensuite (Réalisateur : film de lancement) : valeurs sûres garanties
  if (input.launchFilm === 'always' || input.launchFilm === 'daily' || input.launchFilm === 'off') {
    base.launchFilm = input.launchFilm;
  }
  if (typeof input.launchFilmShownDate === 'string') base.launchFilmShownDate = input.launchFilmShownDate;
  if (typeof input.launchFilmVoice === 'boolean') base.launchFilmVoice = input.launchFilmVoice;
  // champs ajoutés ensuite (Dario : theme/onboarded, Elena : darkMode) : valeurs sûres garanties
  if (input.theme === 'sombre' || input.theme === 'clair') base.theme = input.theme;
  if (typeof input.onboarded === 'boolean') base.onboarded = input.onboarded;
  if (typeof input.darkMode === 'boolean') base.darkMode = input.darkMode;
  // champ ajouté ensuite (Paillette : animations & célébrations) : valeur sûre garantie
  if (typeof input.animations === 'boolean') base.animations = input.animations;
  // champs ajoutés ensuite (Cloche : rappels & notifications M-04) : valeurs sûres garanties
  if (typeof input.reminders === 'boolean') base.reminders = input.reminders;
  if (isReminderLead(input.reminderDefaultMinutes)) base.reminderDefaultMinutes = input.reminderDefaultMinutes;
  if (typeof input.tasksReminder === 'boolean') base.tasksReminder = input.tasksReminder;
  if (typeof input.tasksReminderTime === 'string' && HH_MM.test(input.tasksReminderTime)) {
    const [h, m] = input.tasksReminderTime.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) base.tasksReminderTime = input.tasksReminderTime;
  }
  return base;
}
