import type { Category, EventItem } from '../types';

import { DAY_END, DAY_START, addDaysISO, endMinutesOf, formatDayShort, formatRangeFr, minutesOf, timeOf } from './dates';

import { eventsOnDate } from './events';

/**
 * Radar (M-12) — suggestions de créneaux libres, 100 % locales.
 *
 * Aucune donnée ajoutée au schéma, aucun appel réseau, aucune IA distante :
 * tout se calcule à la volée à partir des événements existants (store zustand,
 * lecture seule ici). L'heuristique :
 *  1. découpe la journée visée en fenêtre utile [DAY_START, DAY_END] ;
 *  2. les événements de la journée (récurrence comprise) y sont « occupés »,
 *     les événements de nuit (hors fenêtre) sont ignorés proprement ;
 *  3. les trous d'au moins la durée présumée (défaut 1 h) deviennent candidats ;
 *  4. les candidats sont pondérés par les habitudes de l'utilisateur
 *     (heure moyenne de début de ses événements, par catégorie si connue)
 *     et pénalisés aux extrêmes (tôt le matin, tard le soir) ;
 *  5. jamais de chevauchement : un créneau proposé est toujours dans un trou ;
 *  6. journée pleine → on propose le jour proche le plus dégagé (horizon 7 jours).
 */

export const RADAR_DEFAULT_DURATION = 60;
export const RADAR_MAX_SUGGESTIONS = 3;
export const RADAR_HORIZON_DAYS = 7;

/** pas entre deux débuts candidats dans un même trou (30 min) */
const STEP_MINUTES = 30;
/** candidats max générés par trou (borne de sécurité) */
const MAX_CANDIDATES_PER_GAP = 24;
/** heure de prédilection quand l'utilisateur n'a encore aucune habitude */
const DEFAULT_PREFERRED_MINUTES = 14 * 60;

export interface RadarInput {
  /** événements existants (tous, la récurrence est résolue à la volée) */
  events: EventItem[];
  /** jour visé, YYYY-MM-DD */
  date: string;
  /** durée présumée du créneau en minutes (défaut 60) */
  durationMinutes?: number;
  /** catégorie envisagée : pondère par les habitudes de cette catégorie */
  category?: Category;
  /** id de l'événement en cours d'édition : il ne se bloque pas lui-même */
  ignoreId?: string;
  /** heure actuelle, pour ne jamais proposer un créneau déjà passé aujourd'hui */
  now?: { date: string; minutes: number };
  /** nombre max de suggestions (défaut 3) */
  maxResults?: number;
  /** horizon de recherche d'un jour de repli (défaut 7 jours) */
  horizonDays?: number;
}

/** un trou dans la journée, en minutes depuis minuit (fenêtre [DAY_START, DAY_END]) */
export interface TimeGap {
  start: number;
  end: number;
}

export interface SlotSuggestion {
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  /** score de pertinence (plus haut = mieux), arrondi au dixième */
  score: number;
}

const WINDOW_START = DAY_START * 60; // 8h00
const WINDOW_END = DAY_END * 60; // 22h00

function clampDuration(n: number): number {
  if (!Number.isFinite(n)) return RADAR_DEFAULT_DURATION;
  return Math.min(8 * 60, Math.max(15, Math.round(n)));
}

/**
 * Intervalles occupés d'une journée, découpés dans la fenêtre utile et fusionnés.
 * Les événements de nuit (avant DAY_START ou après DAY_END) sont ignorés :
 * un créneau 23h00–minuit ou minuit–6h00 ne bloque aucune suggestion.
 */
export function busyIntervals(
  events: EventItem[],
  date: string,
  opts: { ignoreId?: string; windowStart?: number; windowEnd?: number } = {},
): TimeGap[] {
  const ws = opts.windowStart ?? WINDOW_START;
  const we = opts.windowEnd ?? WINDOW_END;
  const raw: TimeGap[] = [];
  for (const inst of eventsOnDate(events, date)) {
    if (inst.event.id === opts.ignoreId) continue;
    const s = Math.max(ws, minutesOf(inst.start));
    const e = Math.min(we, endMinutesOf(inst.end));
    if (e > s) raw.push({ start: s, end: e });
  }
  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TimeGap[] = [];
  for (const iv of raw) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push({ ...iv });
  }
  return merged;
}

/**
 * Les trous d'une journée : complémentaires des intervalles occupés dans la
 * fenêtre [windowStart, windowEnd]. Détection exacte (bornes incluses/exclues
 * calées sur les vraies heures de début/fin des événements).
 */
export function dayGaps(
  events: EventItem[],
  date: string,
  opts: { ignoreId?: string; windowStart?: number; windowEnd?: number } = {},
): TimeGap[] {
  const ws = opts.windowStart ?? WINDOW_START;
  const we = opts.windowEnd ?? WINDOW_END;
  if (we <= ws) return [];
  const busy = busyIntervals(events, date, { ignoreId: opts.ignoreId, windowStart: ws, windowEnd: we });
  const gaps: TimeGap[] = [];
  let cursor = ws;
  for (const iv of busy) {
    if (iv.start > cursor) gaps.push({ start: cursor, end: iv.start });
    cursor = Math.max(cursor, iv.end);
  }
  if (cursor < we) gaps.push({ start: cursor, end: we });
  return gaps;
}

/**
 * Heure habituelle de début de l'utilisateur, en minutes.
 * Moyenne des débuts d'événements (uniquement ceux dans la fenêtre jour :
 * les événements de nuit ne faussent pas les habitudes), filtrée par catégorie
 * si des événements de cette catégorie existent, sinon sur tous les événements.
 * Sans aucune donnée : 14h00 (milieu de journée, choix neutre et gentil).
 */
export function preferredStartMinutes(events: EventItem[], category?: Category): number {
  const inWindow = events.filter((e) => {
    const s = minutesOf(e.start);
    return s >= WINDOW_START && s < WINDOW_END;
  });
  const pool = category ? inWindow.filter((e) => e.category === category) : inWindow;
  const source = pool.length > 0 ? pool : inWindow;
  if (source.length === 0) return DEFAULT_PREFERRED_MINUTES;
  const mean = source.reduce((acc, e) => acc + minutesOf(e.start), 0) / source.length;
  return Math.round(mean / STEP_MINUTES) * STEP_MINUTES;
}

/** score d'un candidat : habitudes d'abord, puis ajustement serré, puis extrêmes */
function scoreCandidate(startMin: number, duration: number, gap: TimeGap, preferred: number): number {
  let score = 100;
  // pondération par les habitudes (5 points par demi-heure d'écart, plafond 40)
  score -= Math.min(40, (Math.abs(startMin - preferred) / STEP_MINUTES) * 5);
  // ajustement serré : un trou à peine plus grand que la durée est idéal
  const slack = gap.end - gap.start - duration;
  if (slack <= 30) score += 8;
  else if (slack <= 120) score += 4;
  // extrêmes : éviter tôt le matin (avant 9h) et tard le soir (fin après 20h)
  if (startMin < 9 * 60) score -= ((9 * 60 - startMin) / STEP_MINUTES) * 3;
  const endMin = startMin + duration;
  if (endMin > 20 * 60) score -= ((endMin - 20 * 60) / STEP_MINUTES) * 3;
  return Math.round(score * 10) / 10;
}

/** tous les débuts candidats d'un trou, espacés de STEP_MINUTES, bornés au dernier possible */
function candidateStarts(gap: TimeGap, duration: number): number[] {
  const last = gap.end - duration;
  if (last < gap.start) return [];
  const starts: number[] = [];
  for (let s = gap.start; s <= last && starts.length < MAX_CANDIDATES_PER_GAP; s += STEP_MINUTES) {
    starts.push(s);
  }
  if (starts[starts.length - 1] !== last) starts.push(last);
  return starts;
}

function slotsForDay(
  events: EventItem[],
  date: string,
  duration: number,
  preferred: number,
  opts: { ignoreId?: string; now?: { date: string; minutes: number } },
): SlotSuggestion[] {
  const nowEff =
    opts.now && opts.now.date === date ? Math.ceil(opts.now.minutes / STEP_MINUTES) * STEP_MINUTES : null;
  const ws = nowEff != null ? Math.max(WINDOW_START, nowEff) : WINDOW_START;
  const gaps = dayGaps(events, date, { ignoreId: opts.ignoreId, windowStart: ws });
  const out: SlotSuggestion[] = [];
  for (const gap of gaps) {
    for (const s of candidateStarts(gap, duration)) {
      out.push({
        date,
        start: timeOf(s),
        end: timeOf(s + duration),
        score: scoreCandidate(s, duration, gap, preferred),
      });
    }
  }
  return out;
}

/**
 * Jusqu'à `maxResults` créneaux libres (défaut 3), triés par pertinence.
 * Jour visé d'abord ; s'il est plein, jour proche le plus dégagé de l'horizon.
 * Aucun créneau ne chevauche un événement existant (ils viennent des trous).
 */
export function suggestSlots(input: RadarInput): SlotSuggestion[] {
  const duration = clampDuration(input.durationMinutes ?? RADAR_DEFAULT_DURATION);
  const maxResults = Math.max(1, Math.min(10, input.maxResults ?? RADAR_MAX_SUGGESTIONS));
  const horizon = Math.max(1, Math.min(31, input.horizonDays ?? RADAR_HORIZON_DAYS));
  const preferred = preferredStartMinutes(input.events, input.category);

  const own = slotsForDay(input.events, input.date, duration, preferred, { ignoreId: input.ignoreId, now: input.now });
  let pool = own;

  if (pool.length === 0) {
    // journée pleine (ou sans trou assez grand) : chercher le jour proche le plus dégagé
    // (minutes libres dans l'horizon, avec une pénalité de proximité de 90 min/jour :
    // un jour proche et bien dégagé vaut mieux qu'un jour lointain vide)
    let bestDate: string | null = null;
    let bestScore = -Infinity;
    for (let i = 1; i <= horizon; i += 1) {
      const d = addDaysISO(input.date, i);
      const gaps = dayGaps(input.events, d, { ignoreId: input.ignoreId });
      const free = gaps.reduce((acc, g) => acc + (g.end - g.start), 0);
      const dayScore = free - 90 * i;
      if (free >= duration && dayScore > bestScore) {
        bestScore = dayScore;
        bestDate = d;
      }
    }
    if (bestDate) {
      pool = slotsForDay(input.events, bestDate, duration, preferred, { ignoreId: input.ignoreId });
    }
  }

  const seen = new Set<string>();
  const ranked = pool
    .filter((s) => {
      const key = `${s.date}|${s.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  return ranked.slice(0, maxResults);
}

/**
 * Libellé FR d'une pastille : « aujourd'hui 14h00 – 15h00 — libre »,
 * « demain 9h00 – 10h00 — libre », « sam. 28 nov. 14h00 – 15h00 — libre ».
 */
export function slotLabel(slot: { date: string; start: string; end: string }, fromISO: string): string {
  const rel =
    slot.date === fromISO
      ? 'aujourd’hui'
      : slot.date === addDaysISO(fromISO, 1)
        ? 'demain'
        : formatDayShort(slot.date);
  return `${rel} ${formatRangeFr(slot.start, slot.end)} — libre`;
}
