import { beforeEach, describe, expect, it } from 'vitest';
import { BackupError, backupFileName, buildBackupPayload, parseBackup, serializeBackup } from '../src/lib/backup';
import { defaultSettings } from '../src/lib/defaults';
import { useStore } from '../src/lib/store';
import type { EventItem, TaskItem } from '../src/types';

const event: EventItem = { id: 'e1', title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'semaine', createdAt: 1 };
const task: TaskItem = { id: 't1', title: 'Rapport', date: '2025-01-10', time: null, category: 'travail', priority: 'haute', done: false, createdAt: 2 };

function sampleState() {
  return { events: [event], tasks: [task], settings: { ...defaultSettings, prenom: 'Camille' } };
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
});

describe('sauvegarde manuelle (export / import JSON)', () => {
  it('export -> import : aller-retour fidèle avec des données réelles', () => {
    const json = serializeBackup(sampleState());
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('centeryou');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeTruthy();
    const back = parseBackup(json);
    expect(back.events).toEqual([event]);
    expect(back.tasks).toEqual([task]);
    expect(back.settings.prenom).toBe('Camille');
  });

  it('parseBackup refuse un JSON invalide avec un message clair', () => {
    expect(() => parseBackup('{{{')).toThrow(BackupError);
    expect(() => parseBackup('{{{')).toThrow(/JSON invalide/);
  });

  it('parseBackup refuse un fichier qui n’est pas une sauvegarde Centeryou', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'autre-app', events: [] }))).toThrow(/pas une sauvegarde Centeryou/);
    expect(() => parseBackup(JSON.stringify([1, 2, 3]))).toThrow(/pas une sauvegarde Centeryou/);
  });

  it('parseBackup refuse un fichier sans aucune donnée exploitable', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'centeryou', version: 1 }))).toThrow(/aucune donnée/);
  });

  it('parseBackup sanitize : éléments invalides écartés, valides conservés', () => {
    const json = JSON.stringify({
      app: 'centeryou',
      version: 1,
      exportedAt: '2025-01-06T10:00:00Z',
      events: [event, { id: 'x' }, null, 'foo'],
      tasks: [task, { title: 'incomplète' }],
      settings: { prenom: 'Léa', dayStart: 9 },
    });
    const back = parseBackup(json);
    expect(back.events).toEqual([event]);
    expect(back.tasks).toEqual([task]);
    expect(back.settings.prenom).toBe('Léa');
    expect(back.settings.dayStart).toBe(9);
    expect(back.settings.sounds).toBe(true); // défaut complété
  });

  it('buildBackupPayload produit un JSON sérialisable et valide', () => {
    const payload = buildBackupPayload(sampleState(), '2025-01-06T10:00:00.000Z');
    expect(() => JSON.stringify(payload)).not.toThrow();
    expect(payload.exportedAt).toBe('2025-01-06T10:00:00.000Z');
  });

  it('nom de fichier de sauvegarde', () => {
    expect(backupFileName('2025-01-06')).toBe('centeryou-sauvegarde-2025-01-06.json');
  });

  it('la restauration via le store remplace les données courantes', () => {
    useStore.getState().addTask({ title: 'Ancienne', date: '2025-01-07', time: null, category: 'autre', priority: 'moyenne' });
    const back = parseBackup(serializeBackup(sampleState()));
    useStore.getState().restoreBackup(back);
    const s = useStore.getState();
    expect(s.tasks.map((t) => t.title)).toEqual(['Rapport']);
    expect(s.events.map((e) => e.title)).toEqual(['Sport']);
    expect(s.settings.prenom).toBe('Camille');
  });
});
