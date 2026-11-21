import { clamp } from './utils';

export const DAY_START = 8;

export const DAY_END = 22;

export const WEEKDAY_NAMES = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysISO(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function addMonthsISO(iso: string, n: number): string {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastOfMonth));
  return toISODate(d);
}

/** 0 = lundi … 6 = dimanche */
export function weekdayOf(iso: string): number {
  const js = parseISO(iso).getDay();
  return (js + 6) % 7;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutes de FIN d'un créneau : "00:00" vaut minuit de fin de journée (24h00 = 1440) */
export function endMinutesOf(time: string): number {
  const m = minutesOf(time);
  return m === 0 ? 24 * 60 : m;
}

export function timeOf(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

/** "14:30" -> "14h30" */
export function formatTimeFr(time: string): string {
  const [h, m] = time.split(':');
  return `${h}h${m}`;
}

/** libellé d'une heure de FIN : « 00:00 » se lit « minuit » (et non « 00h00 ») */
export function formatEndFr(time: string): string {
  return time === '00:00' ? 'minuit' : formatTimeFr(time);
}

export function formatRangeFr(start: string, end: string): string {
  return `${formatTimeFr(start)} – ${formatEndFr(end)}`;
}

/** prochaine occurrence du jour de semaine (aujourd'hui inclus) */
export function nextWeekdayISO(weekday: number, fromISO: string): string {
  let d = fromISO;
  for (let i = 0; i < 8; i += 1) {
    if (weekdayOf(d) === weekday) return d;
    d = addDaysISO(d, 1);
  }
  return fromISO;
}

export function startOfWeekISO(iso: string): string {
  return addDaysISO(iso, -weekdayOf(iso));
}

function frDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('fr-FR', opts).format(parseISO(iso));
}

export function formatDayLong(iso: string): string {
  return frDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatDayShort(iso: string): string {
  return frDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDayNumber(iso: string): string {
  return frDate(iso, { day: 'numeric' });
}

export function formatWeekdayShort(iso: string): string {
  return frDate(iso, { weekday: 'short' });
}

export function formatMonthYear(iso: string): string {
  return frDate(iso, { month: 'long', year: 'numeric' });
}

/** matrice 6 semaines x 7 jours (lundi en premier) couvrant le mois de `iso` */
export function monthMatrix(iso: string): string[][] {
  const first = parseISO(iso);
  const firstOfMonth = toISODate(new Date(first.getFullYear(), first.getMonth(), 1));
  const start = startOfWeekISO(firstOfMonth);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const row: string[] = [];
    for (let d = 0; d < 7; d += 1) row.push(addDaysISO(start, w * 7 + d));
    weeks.push(row);
  }
  return weeks;
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

/**
 * Prochain créneau entier de la grille (ex. « 14:00 »), borné à la journée
 * [DAY_START, DAY_END − 1 h]. Définition unique partagée (ouverture du dialogue
 * d'événement, raccourci « n », page Planning).
 */
export function nextSlot(): string {
  const next = Math.ceil((nowMinutes() + 1) / 60) * 60;
  return timeOf(clamp(next, DAY_START * 60, DAY_END * 60 - 60));
}

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 0 && h < 5) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
