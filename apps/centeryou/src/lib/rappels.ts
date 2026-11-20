import type { EventItem, ReminderLead, Settings, TaskItem } from '../types';

import { categoryLabel } from './categories';

import { addDaysISO, formatDayShort, formatTimeFr, minutesOf, parseISO, toISODate } from './dates';

import { eventOccursOn } from './events';

import { DEFAULT_REMINDER_LEAD, REMINDER_LEAD_LABELS, SNOOZE_MINUTES, isReminderLead } from './rappel-leads';

/**
 * Rappels & notifications locales (M-04) — domaine pur + accès navigateur gardés.
 *
 * Périmètre strict : notifications LOCALES du navigateur (Notification API + service worker
 * existant pour le clic). Aucune promesse de rappel quand l'app est fermée : le moteur ne
 * tourne que quand l'app est ouverte ou en arrière-plan.
 *
 * Heures LOCALES MURALES (jamais d'UTC) : comme tout le reste de l'app, on construit des
 * Date locales à partir des dates ISO + HH:mm — aucun décalage au changement d'heure.
 *
 * Ce module ne doit PAS être importé statiquement par un module du premier chargement :
 * il est chargé en import dynamique (voir lib/rappels-service et app-shell).
 */

export { DEFAULT_REMINDER_LEAD, REMINDER_LEAD_LABELS, SNOOZE_MINUTES, isReminderLead };

/** clé localStorage du tampon anti-doublons (indépendante du store zustand) */
export const RAPPEL_STATE_KEY = 'centeryou-rappels-v1';

/** fenêtre d'occurrences examinée autour d'aujourd'hui (les rappels vont jusqu'à 1 jour avant) */
const OCCURRENCE_WINDOW_DAYS = 2;

/** nombre max d'entrées conservées dans le tampon (anti croissance infinie) */
const MAX_TAMPON = 500;

export type RappelPermission = 'granted' | 'denied' | 'default' | 'unsupported';

/** Tampon persisté : une notification par occurrence, jamais re-notifiée après action. */
export interface RappelState {
  /** clés déjà notifiées (occurrence, ou occurrence#snooze pour un rappel reporté) */
  notifies: string[];
  /** clés marquées « Terminé » : plus jamais notifiées */
  fait: string[];
  /** clé occurrence -> timestamp du rappel reporté (« Reporter de 5 min ») */
  snoozes: Record<string, number>;
  /** dernière date YYYY-MM-DD où le rappel des tâches a été envoyé */
  tachesDate: string;
}

export interface DueEventReminder {
  kind: 'event';
  event: EventItem;
  /** date de l'occurrence rappelée (YYYY-MM-DD, peut différer de event.date si récurrent) */
  occurrence: string;
  /** clé d'occurrence `eventId@occurrence` (référencée par les actions de la notification) */
  key: string;
  /** clé de génération tamponnée (avec #snooze si reporté) */
  genKey: string;
  /** true si ce déclenchement vient d'un « Reporter de 5 min » */
  snoozed: boolean;
}

export interface DueTasksReminder {
  kind: 'tasks';
  count: number;
  date: string;
}

export interface RappelNotification {
  title: string;
  body: string;
  /** tag stable = remplacement, jamais de pile de doublons */
  tag: string;
  icon: string;
  data: { key: string; eventId?: string };
  actions?: { action: string; title: string }[];
}

export interface RappelParam {
  kind: 'voir' | 'fait' | 'reporter';
  value: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function emptyRappelState(): RappelState {
  return { notifies: [], fait: [], snoozes: {}, tachesDate: '' };
}

export function sanitizeRappelState(input: unknown): RappelState {
  const base = emptyRappelState();
  if (!isRecord(input)) return base;
  if (Array.isArray(input.notifies)) base.notifies = input.notifies.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(input.fait)) base.fait = input.fait.filter((x): x is string => typeof x === 'string');
  if (isRecord(input.snoozes)) {
    for (const [k, v] of Object.entries(input.snoozes)) {
      if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v)) base.snoozes[k] = v;
    }
  }
  if (typeof input.tachesDate === 'string') base.tachesDate = input.tachesDate;
  return base;
}

export function loadRappelState(): RappelState {
  if (typeof window === 'undefined') return emptyRappelState();
  try {
    const raw = window.localStorage.getItem(RAPPEL_STATE_KEY);
    if (!raw) return emptyRappelState();
    return sanitizeRappelState(JSON.parse(raw));
  } catch {
    return emptyRappelState();
  }
}

export function saveRappelState(state: RappelState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RAPPEL_STATE_KEY, JSON.stringify(sanitizeRappelState(state)));
  } catch {
    // quota plein ou stockage indisponible : on garde l'état en mémoire (appel suivant), aucun crash
  }
}

/** clé d'une occurrence de rappel : `eventId@YYYY-MM-DD` */
export function occurrenceKey(eventId: string, occurrence: string): string {
  return `${eventId}@${occurrence}`;
}

/** date du jour de `occ` dans la clé, pour le nettoyage du tampon */
function keyDate(key: string): string {
  const at = key.indexOf('@');
  return at >= 0 ? key.slice(at + 1).split('#')[0] : '';
}

/** supprime les entrées trop vieilles (occurrences d'il y a plus de 3 jours) et borne le tampon */
export function pruneRappelState(state: RappelState, today: string, nowMs: number): RappelState {
  const cutoff = addDaysISO(today, -3);
  const keep = (k: string) => {
    const d = keyDate(k);
    return d >= cutoff;
  };
  const notifies = state.notifies.filter(keep).slice(-MAX_TAMPON);
  const fait = state.fait.filter(keep).slice(-MAX_TAMPON);
  const snoozes: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.snoozes)) {
    if (keep(k) && v > nowMs - 3 * 24 * 60 * 60 * 1000) snoozes[k] = v;
  }
  return { notifies, fait, snoozes, tachesDate: state.tachesDate };
}

/** marque une occurrence/génération comme notifiée (anti-doublons) */
export function applyShown(state: RappelState, r: DueEventReminder): RappelState {
  if (state.notifies.includes(r.genKey)) return state;
  return { ...state, notifies: [...state.notifies, r.genKey] };
}

/** action « Terminé » : l'occurrence ne sera plus jamais notifiée */
export function markOccurrenceDone(state: RappelState, key: string): RappelState {
  const fait = state.fait.includes(key) ? state.fait : [...state.fait, key];
  const notifies = state.notifies.includes(key) ? state.notifies : [...state.notifies, key];
  return { ...state, fait, notifies };
}

/** action « Reporter de 5 min » : reprogramme UNE seule fois, proprement (idempotent :
 *  un second clic tant que le report est en attente ne recule pas une deuxième fois) */
export function snoozeOccurrence(state: RappelState, key: string, nowMs: number): RappelState {
  const until = nowMs + SNOOZE_MINUTES * 60 * 1000;
  const prev = state.snoozes[key] ?? 0;
  const snoozes = { ...state.snoozes, [key]: prev > nowMs ? prev : until };
  const notifies = state.notifies.includes(key) ? state.notifies : [...state.notifies, key];
  return { ...state, snoozes, notifies };
}

/** instant local mural du début d'une occurrence (Date locale, jamais d'UTC) */
export function eventStartDateTime(ev: EventItem, occurrence: string): Date {
  const d = parseISO(occurrence);
  d.setMinutes(d.getMinutes() + minutesOf(ev.start));
  return d;
}

/** instant local mural du rappel : début de l'occurrence moins `lead` minutes (peut tomber la veille) */
export function reminderDateTime(ev: EventItem, occurrence: string, lead: number): Date {
  const d = parseISO(occurrence);
  d.setMinutes(d.getMinutes() + minutesOf(ev.start) - lead);
  return d;
}

/** occurrences de l'événement dans une fenêtre autour d'aujourd'hui (récurrence comprise) */
export function occurrenceDatesNear(ev: EventItem, today: string): string[] {
  const out: string[] = [];
  for (let i = -OCCURRENCE_WINDOW_DAYS; i <= OCCURRENCE_WINDOW_DAYS; i += 1) {
    const occ = addDaysISO(today, i);
    if (eventOccursOn(ev, occ)) out.push(occ);
  }
  return out;
}

/**
 * Rappels à déclencher MAINTENANT (heure locale murale `now`) :
 * - un rappel d'événement est dû si son instant de rappel est atteint ET que l'événement
 *   n'a pas encore commencé (pas de notification fantôme pour un événement passé ou supprimé :
 *   un événement supprimé n'est plus dans la liste, donc plus jamais rappelé) ;
 * - une seule notification par occurrence/génération, grâce au tampon `state`.
 */
export function computeDueReminders(
  events: EventItem[],
  tasks: TaskItem[],
  settings: Settings,
  now: Date,
  state: RappelState,
): { reminders: DueEventReminder[]; tasks: DueTasksReminder | null } {
  const reminders: DueEventReminder[] = [];
  if (!settings.reminders) return { reminders, tasks: null };
  const today = toISODate(now);
  const nowMs = now.getTime();
  for (const ev of events) {
    const lead = ev.reminderMinutes ?? null;
    if (lead == null || !isReminderLead(lead)) continue;
    for (const occ of occurrenceDatesNear(ev, today)) {
      const key = occurrenceKey(ev.id, occ);
      if (state.fait.includes(key)) continue;
      const base = reminderDateTime(ev, occ, lead).getTime();
      const snooze = state.snoozes[key] ?? 0;
      const fireAt = Math.max(base, snooze);
      const snoozed = snooze > base;
      const genKey = snoozed ? `${key}#${snooze}` : key;
      if (state.notifies.includes(genKey)) continue;
      const startAt = eventStartDateTime(ev, occ).getTime();
      if (nowMs >= fireAt && nowMs < startAt) {
        reminders.push({ kind: 'event', event: ev, occurrence: occ, key, genKey, snoozed });
      }
    }
  }
  let tasksReminder: DueTasksReminder | null = null;
  if (settings.tasksReminder && state.tachesDate !== today) {
    const [h, m] = settings.tasksReminderTime.split(':').map(Number);
    const atMin = (h || 0) * 60 + (m || 0);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin >= atMin) {
      const undone = tasks.filter((t) => t.date === today && !t.done).length;
      if (undone > 0) tasksReminder = { kind: 'tasks', count: undone, date: today };
    }
  }
  return { reminders, tasks: tasksReminder };
}

/** corps de la notification d'un événement : heure + catégorie (et jour si l'occurrence n'est pas aujourd'hui) */
export function buildEventNotification(r: DueEventReminder, actionsOk: boolean): RappelNotification {
  const ev = r.event;
  const today = toISODate(new Date());
  const heure = formatTimeFr(ev.start);
  const cat = categoryLabel(ev.category);
  const rep = r.snoozed ? ' (reporté)' : '';
  const body =
    r.occurrence === today ? `À ${heure} · ${cat}${rep}` : `${formatDayShort(r.occurrence)} à ${heure} · ${cat}${rep}`;
  return {
    title: ev.title,
    body,
    tag: r.key,
    icon: '/icons/icon-192.png',
    data: { key: r.key, eventId: ev.id },
    actions: actionsOk
      ? [
          { action: 'done', title: 'Terminé' },
          { action: 'snooze', title: `Reporter de ${SNOOZE_MINUTES} min` },
        ]
      : undefined,
  };
}

export function buildTasksNotification(count: number, date: string): RappelNotification {
  return {
    title: `Il te reste ${count} tâche${count > 1 ? 's' : ''} aujourd’hui`,
    body: 'Ouvre Centeryou pour les voir.',
    tag: `taches@${date}`,
    icon: '/icons/icon-192.png',
    data: { key: `taches@${date}` },
  };
}

export function rappelPermission(): RappelPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  return p === 'granted' || p === 'denied' || p === 'default' ? p : 'default';
}

/**
 * Demande la permission AU BON MOMENT (geste utilisateur : création d'événement avec rappel,
 * ou bouton « Activer les rappels » des Réglages). Ne demande jamais si déjà tranché.
 */
export async function requestRappelPermission(): Promise<RappelPermission> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  if (typeof Notification.requestPermission !== 'function') return rappelPermission();
  if (Notification.permission !== 'default') return rappelPermission();
  try {
    const res = await Notification.requestPermission();
    return res === 'granted' || res === 'denied' ? res : 'default';
  } catch {
    return rappelPermission();
  }
}

/** les boutons d'action dans la notification ne sont possibles que via le service worker (maxActions ≥ 2) */
export function notificationActionsSupported(): boolean {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const max = (Notification as unknown as { maxActions?: number }).maxActions;
  return typeof max === 'number' && max >= 2;
}

/**
 * Affiche une notification locale : via le service worker existant quand c'est possible
 * (c'est lui qui recevra le clic et les boutons d'action), sinon via `new Notification`
 * avec un clic qui ramène l'app sur la page Aujourd'hui.
 */
export async function showRappelNotification(n: RappelNotification): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        // `actions` n'existe que via showNotification du service worker (boutons « Terminé » / « Reporter »)
        const options = {
          body: n.body,
          tag: n.tag,
          icon: n.icon,
          data: n.data,
          actions: n.actions,
        } as NotificationOptions & { actions?: { action: string; title: string }[] };
        await reg.showNotification(n.title, options);
        return true;
      }
    }
    const notif = new Notification(n.title, { body: n.body, tag: n.tag, icon: n.icon, data: n.data });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      const id = n.data.eventId ?? '';
      window.location.assign(id ? `/aujourdhui?rappel=voir:${encodeURIComponent(id)}` : '/aujourdhui');
    };
    return true;
  } catch {
    return false;
  }
}

/** paramètre d'URL posé par le service worker au clic sur une notification */
export function parseRappelParam(search: string): RappelParam | null {
  let p: string | null = null;
  try {
    p = new URLSearchParams(search).get('rappel');
  } catch {
    return null;
  }
  if (!p) return null;
  const sep = p.indexOf(':');
  const kind = sep >= 0 ? p.slice(0, sep) : '';
  const value = sep >= 0 ? p.slice(sep + 1) : '';
  if ((kind === 'voir' || kind === 'fait' || kind === 'reporter') && value) return { kind, value: decodeURIComponent(value) };
  return null;
}
