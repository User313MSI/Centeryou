import type { ReminderLead } from '../types';

/**
 * Constantes des rappels (M-04) — module volontairement minuscule et sans API navigateur :
 * il est partagé par le schéma (sanitize), les dialogues et le moteur, sans alourdir
 * le premier chargement (le moteur, lui, reste en import dynamique : lib/rappels-service).
 */

export const REMINDER_LEADS: ReminderLead[] = [5, 10, 30, 60, 1440];

export const DEFAULT_REMINDER_LEAD: ReminderLead = 10;

export const REMINDER_LEAD_LABELS: Record<ReminderLead, string> = {
  5: '5 min avant',
  10: '10 min avant',
  30: '30 min avant',
  60: '1 h avant',
  1440: '1 jour avant',
};

/** délai du bouton « Reporter de 5 min » d'une notification */
export const SNOOZE_MINUTES = 5;

export function isReminderLead(v: unknown): v is ReminderLead {
  return (REMINDER_LEADS as number[]).includes(v as number);
}
