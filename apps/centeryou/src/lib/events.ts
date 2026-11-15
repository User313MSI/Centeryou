import type { Category, EventItem, TaskItem } from '../types';
import { endMinutesOf, minutesOf, parseISO, timeOf, weekdayOf } from './dates';

export interface EventInstance {
  event: EventItem;
  date: string;
  start: string;
  end: string;
}

export function eventOccursOn(ev: EventItem, iso: string): boolean {
  if (iso < ev.date) return false;
  switch (ev.repeat) {
    case 'jamais':
      return iso === ev.date;
    case 'jour':
      return true;
    case 'semaine':
      return weekdayOf(iso) === weekdayOf(ev.date);
    case 'mois':
      return parseISO(iso).getDate() === parseISO(ev.date).getDate();
    default:
      return iso === ev.date;
  }
}

export function eventsOnDate(events: EventItem[], iso: string): EventInstance[] {
  return events
    .filter((e) => eventOccursOn(e, iso))
    .map((e) => ({ event: e, date: iso, start: e.start, end: e.end }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.event.createdAt - b.event.createdAt);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  // une fin à 00:00 = minuit (24h00) : elle chevauche bien les créneaux tardifs
  return minutesOf(aStart) < endMinutesOf(bEnd) && minutesOf(bStart) < endMinutesOf(aEnd);
}

export interface Conflict {
  other: EventItem;
  /** vrai si même créneau exact (même début ET même fin) */
  exact: boolean;
}

/**
 * Élément unifié affiché dans les vues du planning :
 * un événement OU une tâche datée (les tâches avec heure sont positionnables,
 * les tâches sans heure n'apparaissent qu'en vue Mois, à leur date).
 */
export interface CalendarInstance {
  kind: 'event' | 'task';
  id: string;
  title: string;
  category: Category;
  date: string;
  start: string;
  end: string;
  done: boolean;
  event?: EventItem;
  task?: TaskItem;
}

function toEventInstance(i: EventInstance): CalendarInstance {
  return {
    kind: 'event',
    id: i.event.id,
    title: i.event.title,
    category: i.event.category,
    date: i.date,
    start: i.start,
    end: i.end,
    done: false,
    event: i.event,
  };
}

/** Jour / Semaine : événements du jour + tâches du jour AVEC heure (1 h par défaut). */
export function calendarOnDate(events: EventItem[], tasks: TaskItem[], iso: string): CalendarInstance[] {
  const evs = eventsOnDate(events, iso).map(toEventInstance);
  const tks: CalendarInstance[] = tasks
    .filter((t) => t.date === iso && t.time)
    .map((t) => ({
      kind: 'task',
      id: t.id,
      title: t.title,
      category: t.category,
      date: iso,
      start: t.time as string,
      end: timeOf(minutesOf(t.time as string) + 60),
      done: t.done,
      task: t,
    }));
  return [...evs, ...tks].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

/** Mois : événements du jour + TOUTES les tâches du jour (avec ou sans heure). */
export function calendarMonthOnDate(events: EventItem[], tasks: TaskItem[], iso: string): CalendarInstance[] {
  const evs = eventsOnDate(events, iso).map(toEventInstance);
  const tks: CalendarInstance[] = tasks
    .filter((t) => t.date === iso)
    .map((t) => ({
      kind: 'task',
      id: t.id,
      title: t.title,
      category: t.category,
      date: iso,
      start: t.time ?? '',
      end: t.time ? timeOf(minutesOf(t.time) + 60) : '',
      done: t.done,
      task: t,
    }));
  return [...evs, ...tks].sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || a.title.localeCompare(b.title));
}

export function findConflict(
  events: EventItem[],
  candidate: { date: string; start: string; end: string },
  ignoreId?: string,
): Conflict | null {
  for (const inst of eventsOnDate(events, candidate.date)) {
    if (inst.event.id === ignoreId) continue;
    if (overlaps(candidate.start, candidate.end, inst.start, inst.end)) {
      return {
        other: inst.event,
        exact: inst.start === candidate.start && inst.end === candidate.end,
      };
    }
  }
  return null;
}
