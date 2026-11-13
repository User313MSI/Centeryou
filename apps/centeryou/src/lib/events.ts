import type { EventItem } from '../types';
import { minutesOf, parseISO, weekdayOf } from './dates';

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
  return minutesOf(aStart) < minutesOf(bEnd) && minutesOf(bStart) < minutesOf(aEnd);
}

export interface Conflict {
  other: EventItem;
  /** vrai si même créneau exact (même début ET même fin) */
  exact: boolean;
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
