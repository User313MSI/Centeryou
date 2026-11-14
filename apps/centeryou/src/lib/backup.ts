import type { EventItem, Settings, TaskItem } from '../types';
import { todayISO } from './dates';
import { sanitizeEvents, sanitizeSettings, sanitizeTasks } from './sanitize';

export const BACKUP_APP_ID = 'centeryou';
export const BACKUP_VERSION = 1;

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

export function buildBackupPayload(state: BackupState, exportedAt: string = new Date().toISOString()): BackupPayload {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt,
    events: sanitizeEvents(state.events),
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
  const events = sanitizeEvents(rec.events);
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

/** Lit un fichier de sauvegarde choisi par l’utilisateur (FileReader, compatible partout). */
export function readBackupFile(file: Blob): Promise<string> {
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
