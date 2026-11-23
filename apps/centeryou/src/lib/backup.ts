import type { EventItem, Settings, TaskItem } from '../types';
import { endMinutesOf, minutesOf, timeOf, todayISO } from './dates';

import { ICS_MAX_TITLE } from './ics';
import { sanitizeEvents, sanitizeSettings, sanitizeTasks } from './sanitize';

export const BACKUP_APP_ID = 'centeryou';
export const BACKUP_VERSION = 1;

/** Plafond de taille d'un fichier de sauvegarde importé : 5 Mo (garde-fou Chrono n°1, M-32). */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export interface BackupPayload {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  events: EventItem[];
  tasks: TaskItem[];
  settings: Settings;
}

export class BackupError extends Error {}

export interface BackupState {
  events: EventItem[];
  tasks: TaskItem[];
  settings: Settings;
}

/**
 * M-32 Verrou 2 (garde-fou Chrono n°1) — nettoyage renforcé des événements d'une
 * sauvegarde : titre plafonné à ICS_MAX_TITLE (140 car, comme l'import ICS) et un
 * événement qui finit avant de commencer est remis droit (fin = début + 30 min,
 * bornée à 23:59) — plus d'événement fantôme 23:00→02:00 invisible en vue Jour.
 */
function sanitizeBackupEvents(input: unknown): EventItem[] {
  return sanitizeEvents(input).map((ev) => {
    const title = ev.title.length > ICS_MAX_TITLE ? ev.title.slice(0, ICS_MAX_TITLE) : ev.title;
    const end = endMinutesOf(ev.end) <= minutesOf(ev.start) ? timeOf(minutesOf(ev.start) + 30) : ev.end;
    return { ...ev, title, end };
  });
}

export function buildBackupPayload(state: BackupState, exportedAt: string = new Date().toISOString()): BackupPayload {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt,
    events: sanitizeBackupEvents(state.events),
    tasks: sanitizeTasks(state.tasks),
    settings: sanitizeSettings(state.settings),
  };
}

export function serializeBackup(state: BackupState): string {
  return JSON.stringify(buildBackupPayload(state), null, 2);
}

export function backupFileName(date: string = todayISO()): string {
  return `centeryou-sauvegarde-${date}.json`;
}

/**
 * Valide et nettoie un fichier de sauvegarde importé.
 * Lance une BackupError avec un message clair en français si le fichier est inutilisable.
 */
export function parseBackup(json: string): BackupPayload {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BackupError('Ce fichier est illisible (JSON invalide). Choisis un fichier exporté depuis Centeryou.');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new BackupError("Ce fichier n'est pas une sauvegarde Centeryou valide.");
  }
  const rec = data as Record<string, unknown>;
  if (rec.app !== BACKUP_APP_ID) {
    throw new BackupError("Ce fichier n'est pas une sauvegarde Centeryou (identifiant inconnu).");
  }
  const events = sanitizeBackupEvents(rec.events);
  const tasks = sanitizeTasks(rec.tasks);
  if (events.length === 0 && tasks.length === 0 && !rec.settings) {
    throw new BackupError('Ce fichier ne contient aucune donnée Centeryou exploitable.');
  }
  return {
    app: BACKUP_APP_ID,
    version: typeof rec.version === 'number' ? rec.version : BACKUP_VERSION,
    exportedAt: typeof rec.exportedAt === 'string' ? rec.exportedAt : new Date().toISOString(),
    events,
    tasks,
    settings: sanitizeSettings(rec.settings),
  };
}

/**
 * Lit un fichier de sauvegarde choisi par l’utilisateur (FileReader, compatible partout).
 * M-32 (garde-fou Chrono n°1) : plafond de 5 Mo — au-delà, refus propre avec un
 * message clair en français AVANT toute lecture (un fichier géant n'est jamais
 * chargé en mémoire).
 */
export function readBackupFile(file: Blob): Promise<string> {
  if (file.size > BACKUP_MAX_BYTES) {
    const mo = (file.size / (1024 * 1024)).toFixed(1).replace('.', ',');
    return Promise.reject(
      new BackupError(`Ce fichier est trop volumineux (${mo} Mo) : la limite est de 5 Mo. Aucune donnée n'a été modifiée.`),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new BackupError('Impossible de lire ce fichier.'));
    reader.readAsText(file);
  });
}

/** Télécharge le JSON de sauvegarde dans le navigateur (bouton « Sauvegarder mes données »). */
export function downloadBackup(json: string, fileName: string = backupFileName()): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
