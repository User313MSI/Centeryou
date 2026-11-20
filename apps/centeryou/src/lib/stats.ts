import type { Category, EventItem, TaskItem } from '../types';
import { categoryLabel } from './categories';
import {
  addDaysISO,
  endMinutesOf,
  minutesOf,
  pad2,
  parseISO,
  startOfWeekISO,
  WEEKDAY_NAMES,
  weekdayOf,
} from './dates';
import { eventOccursOn } from './events';

/** nombre de semaines affichées dans « Temps par semaine » */
export const STATS_WEEKS = 4;
/** fenêtre des habitudes (jours actifs, répartition par catégorie) : 4 semaines */
export const STATS_HABIT_DAYS = 28;

/** ordre fixe d'affichage des catégories (légendes, barres empilées, donut) */
export const CATEGORY_ORDER: Category[] = ['travail', 'perso', 'sante', 'focus', 'autre'];

export function emptyCategoryMap(): Record<Category, number> {
  return { travail: 0, perso: 0, sante: 0, focus: 0, autre: 0 };
}

/** durée d'un événement en minutes (« 00:00 » en fin = minuit de fin de journée, 24h00) */
export function eventMinutes(ev: EventItem): number {
  return Math.max(0, endMinutesOf(ev.end) - minutesOf(ev.start));
}

export interface WeekStats {
  /** lundi de la semaine (ISO) */
  start: string;
  /** libellé court du lundi, ex. « 10 nov. » */
  label: string;
  totalMinutes: number;
  byCategory: Record<Category, number>;
}

/** lundi de la semaine de `iso`, décalé de `offsetWeeks` semaines */
export function weekStartOffset(iso: string, offsetWeeks: number): string {
  return addDaysISO(startOfWeekISO(iso), offsetWeeks * 7);
}

/** « 10 nov. » (jour + mois court, pour l'axe des semaines) */
export function formatWeekLabel(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(parseISO(iso));
}

/**
 * Les `count` dernières semaines (semaine en cours incluse), de la plus ancienne
 * à la plus récente. Les répétitions sont développées jour par jour.
 */
export function statsWeeks(events: EventItem[], today: string, count: number = STATS_WEEKS): WeekStats[] {
  const weeks: WeekStats[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = weekStartOffset(today, -i);
    const byCategory = emptyCategoryMap();
    let totalMinutes = 0;
    for (let d = 0; d < 7; d += 1) {
      const iso = addDaysISO(start, d);
      for (const ev of events) {
        if (!eventOccursOn(ev, iso)) continue;
        const m = eventMinutes(ev);
        byCategory[ev.category] += m;
        totalMinutes += m;
      }
    }
    weeks.push({ start, label: formatWeekLabel(start), totalMinutes, byCategory });
  }
  return weeks;
}

/** variation en % de `current` par rapport à `previous` ; null si `previous` vaut 0 */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** minutes planifiées par jour de semaine (0 = lundi … 6 = dimanche) sur les `days` derniers jours */
export function weekdayMinutes(events: EventItem[], today: string, days: number = STATS_HABIT_DAYS): number[] {
  const result = [0, 0, 0, 0, 0, 0, 0];
  const from = addDaysISO(today, -(days - 1));
  for (let i = 0; i < days; i += 1) {
    const iso = addDaysISO(from, i);
    const wd = weekdayOf(iso);
    for (const ev of events) {
      if (eventOccursOn(ev, iso)) result[wd] += eventMinutes(ev);
    }
  }
  return result;
}

/** jour de semaine le plus chargé sur la fenêtre ; null si aucun temps planifié */
export function busiestWeekday(
  events: EventItem[],
  today: string,
  days: number = STATS_HABIT_DAYS,
): { index: number; minutes: number } | null {
  const perDay = weekdayMinutes(events, today, days);
  let best = -1;
  for (let i = 0; i < 7; i += 1) {
    if (perDay[i] > 0 && (best === -1 || perDay[i] > perDay[best])) best = i;
  }
  return best === -1 ? null : { index: best, minutes: perDay[best] };
}

/** répartition des minutes planifiées par catégorie sur les `days` derniers jours (catégories à 0 exclues) */
export function categoryDistribution(
  events: EventItem[],
  today: string,
  days: number = STATS_HABIT_DAYS,
): { category: Category; minutes: number }[] {
  const totals = emptyCategoryMap();
  const from = addDaysISO(today, -(days - 1));
  for (let i = 0; i < days; i += 1) {
    const iso = addDaysISO(from, i);
    for (const ev of events) {
      if (eventOccursOn(ev, iso)) totals[ev.category] += eventMinutes(ev);
    }
  }
  return CATEGORY_ORDER.map((category) => ({ category, minutes: totals[category] })).filter((x) => x.minutes > 0);
}

export interface CompletionStats {
  done: number;
  total: number;
  /** null quand aucune tâche dans la fenêtre */
  percent: number | null;
}

/** taux de complétion des tâches sur les `days` derniers jours (aujourd'hui inclus) */
export function completionRate(tasks: TaskItem[], today: string, days: number): CompletionStats {
  const from = addDaysISO(today, -(days - 1));
  const inWindow = tasks.filter((t) => t.date >= from && t.date <= today);
  const done = inWindow.filter((t) => t.done).length;
  return {
    done,
    total: inWindow.length,
    percent: inWindow.length === 0 ? null : Math.round((done / inWindow.length) * 100),
  };
}

/**
 * Série de « jours organisés » : jours consécutifs comptant au moins une tâche
 * accomplie, en remontant depuis aujourd'hui — ou depuis hier si aujourd'hui
 * n'a encore rien d'accompli (la série n'est alors pas rompue).
 */
export function organizedStreak(tasks: TaskItem[], today: string): number {
  const doneDays = new Set(tasks.filter((t) => t.done).map((t) => t.date));
  if (doneDays.size === 0) return 0;
  let cursor = doneDays.has(today) ? today : addDaysISO(today, -1);
  if (!doneDays.has(cursor)) return 0;
  let streak = 0;
  while (doneDays.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/** minutes -> « 2 h » / « 2 h 30 » */
export function formatHoursFr(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h} h`;
  return `${h} h ${pad2(rem)}`;
}

/** libellé de variation : « +25 % », « −10 % », « stable », « — » si non calculable */
export function formatDeltaFr(delta: number | null): string {
  if (delta === null) return '—';
  if (delta === 0) return 'stable';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} %`;
}

/**
 * Insight écrit (2-3 phrases, français naturel, aucun jugement) calculé depuis
 * les données : journée la plus chargée, catégorie qui progresse/recule le plus
 * cette semaine, complétion des tâches (ou série de jours organisés).
 */
export function buildInsight(events: EventItem[], tasks: TaskItem[], today: string): string {
  if (events.length === 0 && tasks.length === 0) return '';
  const phrases: string[] = [];

  const busiest = busiestWeekday(events, today);
  if (busiest) {
    phrases.push(
      `Ta journée la plus chargée : ${WEEKDAY_NAMES[busiest.index]}, avec ${formatHoursFr(busiest.minutes)} planifiées sur les ${STATS_HABIT_DAYS / 7} dernières semaines.`,
    );
  }

  const weeks = statsWeeks(events, today, STATS_WEEKS);
  const current = weeks[weeks.length - 1];
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : undefined;
  if (current && previous) {
    let bestCategory: Category | null = null;
    let bestDelta = 0;
    for (const c of CATEGORY_ORDER) {
      const d = current.byCategory[c] - previous.byCategory[c];
      if (Math.abs(d) > Math.abs(bestDelta)) {
        bestDelta = d;
        bestCategory = c;
      }
    }
    if (bestCategory && bestDelta !== 0) {
      const label = categoryLabel(bestCategory);
      phrases.push(
        bestDelta > 0
          ? `${label} progresse de ${formatHoursFr(bestDelta)} cette semaine.`
          : `${label} recule de ${formatHoursFr(-bestDelta)} cette semaine.`,
      );
    }
  }

  const completion7 = completionRate(tasks, today, 7);
  const streak = organizedStreak(tasks, today);
  if (completion7.total > 0) {
    phrases.push(`Sur les 7 derniers jours, ${completion7.percent ?? 0} % de tes tâches sont accomplies.`);
  } else if (streak > 0) {
    phrases.push(streak > 1 ? `Série en cours : ${streak} jours organisés d'affilée.` : "Série en cours : 1 jour organisé d'affilée.");
  } else {
    phrases.push('Aucune tâche sur les 7 derniers jours.');
  }

  if (phrases.length === 0) {
    phrases.push('Continue à planifier : tes statistiques se construisent semaine après semaine.');
  }
  return phrases.slice(0, 3).join(' ');
}

export interface StatsData {
  today: string;
  weeks: WeekStats[];
  /** variation de la semaine en cours vs la semaine précédente (null si semaine précédente vide) */
  weekDelta: number | null;
  perWeekday: number[];
  busiest: { index: number; minutes: number } | null;
  distribution: { category: Category; minutes: number }[];
  completion7: CompletionStats;
  completion30: CompletionStats;
  streak: number;
  totalMinutes: number;
  insight: string;
  hasData: boolean;
}

/** calcule toutes les statistiques affichées sur /stats (données 100 % locales) */
export function computeStats(events: EventItem[], tasks: TaskItem[], today: string): StatsData {
  const weeks = statsWeeks(events, today, STATS_WEEKS);
  const current = weeks[weeks.length - 1];
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : undefined;
  const distribution = categoryDistribution(events, today, STATS_HABIT_DAYS);
  const totalMinutes = distribution.reduce((acc, x) => acc + x.minutes, 0);
  return {
    today,
    weeks,
    weekDelta: previous ? deltaPercent(current.totalMinutes, previous.totalMinutes) : null,
    perWeekday: weekdayMinutes(events, today, STATS_HABIT_DAYS),
    busiest: busiestWeekday(events, today, STATS_HABIT_DAYS),
    distribution,
    completion7: completionRate(tasks, today, 7),
    completion30: completionRate(tasks, today, 30),
    streak: organizedStreak(tasks, today),
    totalMinutes,
    insight: buildInsight(events, tasks, today),
    hasData: events.length > 0 || tasks.length > 0,
  };
}
