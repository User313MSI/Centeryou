import { beforeEach, describe, expect, it } from 'vitest';

import { buildBackupPayload, parseBackup, serializeBackup } from '../src/lib/backup';

import { defaultSettings } from '../src/lib/defaults';

import { toISODate } from '../src/lib/dates';

import {
  applyShown,
  buildEventNotification,
  buildTasksNotification,
  computeDueReminders,
  emptyRappelState,
  eventStartDateTime,
  loadRappelState,
  markOccurrenceDone,
  occurrenceDatesNear,
  occurrenceKey,
  parseRappelParam,
  pruneRappelState,
  reminderDateTime,
  sanitizeRappelState,
  saveRappelState,
  snoozeOccurrence,
  RAPPEL_STATE_KEY,
  type DueEventReminder,
} from '../src/lib/rappels';

import { REMINDER_LEADS, isReminderLead } from '../src/lib/rappel-leads';

import { sanitizeEvents, sanitizeSettings } from '../src/lib/sanitize';

import { useStore } from '../src/lib/store';

import type { EventItem, Settings, TaskItem } from '../src/types';

// vendredi 2026-11-20, heure locale murale (jamais d'UTC)
const TODAY = '2026-11-20';
const at = (h: number, m: number, s = 0) => new Date(2026, 10, 20, h, m, s);

function ev(over: Partial<EventItem> = {}): EventItem {
  return {
    id: 'e1',
    title: 'Réunion équipe',
    date: TODAY,
    start: '10:00',
    end: '11:00',
    category: 'travail',
    repeat: 'jamais',
    createdAt: 1,
    reminderMinutes: 10,
    ...over,
  };
}

function taskToday(done = false): TaskItem {
  return { id: `t-${done ? 'd' : 'u'}-${Math.random()}`, title: 'Rapport', date: TODAY, time: null, category: 'travail', priority: 'moyenne', done, createdAt: 2 };
}

function settings(over: Partial<Settings> = {}): Settings {
  return { ...defaultSettings, ...over };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('Rappels — constantes & leads', () => {
  it('les 5 délais proposés, 10 min par défaut', () => {
    expect(REMINDER_LEADS).toEqual([5, 10, 30, 60, 1440]);
    expect(isReminderLead(10)).toBe(true);
    expect(isReminderLead(7)).toBe(false);
    expect(isReminderLead('10')).toBe(false);
    expect(isReminderLead(null)).toBe(false);
  });
});

describe('Rappels — calcul des instants (heure locale murale)', () => {
  it('rappel 10 min avant : 10h00 -> 9h50 le même jour', () => {
    const d = reminderDateTime(ev(), TODAY, 10);
    expect(toISODate(d)).toBe(TODAY);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(50);
  });

  it('rappel 1 jour avant : 10h00 demain -> aujourd’hui 10h00', () => {
    const d = reminderDateTime(ev({ date: '2026-11-21' }), '2026-11-21', 1440);
    expect(toISODate(d)).toBe(TODAY);
    expect(d.getHours()).toBe(10);
  });

  it('traversée de minuit : événement à 0h30, rappel 1 h avant -> veille 23h30', () => {
    const d = reminderDateTime(ev({ start: '00:30' }), TODAY, 60);
    expect(toISODate(d)).toBe('2026-11-19');
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(30);
  });

  it('eventStartDateTime : début de l’occurrence en heure locale', () => {
    const d = eventStartDateTime(ev(), TODAY);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
  });

  it('occurrenceDatesNear inclut aujourd’hui et les récurrences', () => {
    const daily = ev({ repeat: 'jour', date: '2026-11-18' });
    const occ = occurrenceDatesNear(daily, TODAY);
    expect(occ).toContain(TODAY);
    expect(occ).toContain('2026-11-19');
    expect(occ).toContain('2026-11-21');
    const oneShot = ev({ repeat: 'jamais', date: '2026-11-22' });
    expect(occurrenceDatesNear(oneShot, TODAY)).toContain('2026-11-22'); // fenêtre +2 jours (rappel 1 jour avant)
    expect(occurrenceDatesNear(oneShot, TODAY)).not.toContain('2026-11-23');
  });
});

describe('Rappels — déclenchement à l’heure exacte', () => {
  it('à 9h50 pile : dû ; à 9h49m59 : pas encore', () => {
    const e = ev();
    const { reminders } = computeDueReminders([e], [], settings(), at(9, 50, 0), emptyRappelState());
    expect(reminders).toHaveLength(1);
    expect(reminders[0].key).toBe(occurrenceKey('e1', TODAY));
    expect(reminders[0].snoozed).toBe(false);
    const tot = computeDueReminders([e], [], settings(), at(9, 49, 59), emptyRappelState());
    expect(tot.reminders).toHaveLength(0);
  });

  it('événement déjà commencé (10h00) : plus de notification', () => {
    const { reminders } = computeDueReminders([ev()], [], settings(), at(10, 0, 0), emptyRappelState());
    expect(reminders).toHaveLength(0);
  });

  it('pas de rappel configuré (null ou absent) : jamais notifié', () => {
    expect(computeDueReminders([ev({ reminderMinutes: null })], [], settings(), at(9, 50), emptyRappelState()).reminders).toHaveLength(0);
    const sansChamp = ev();
    delete sansChamp.reminderMinutes;
    expect(computeDueReminders([sansChamp], [], settings(), at(9, 50), emptyRappelState()).reminders).toHaveLength(0);
  });

  it('réglage global « tous les rappels » coupé : rien', () => {
    const { reminders, tasks } = computeDueReminders([ev()], [taskToday()], settings({ reminders: false }), at(9, 50), emptyRappelState());
    expect(reminders).toHaveLength(0);
    expect(tasks).toBeNull();
  });

  it('récurrence quotidienne : événement d’hier 10h00 rappelé aujourd’hui à 9h50', () => {
    const daily = ev({ repeat: 'jour', date: '2026-11-19' });
    const { reminders } = computeDueReminders([daily], [], settings(), at(9, 50), emptyRappelState());
    expect(reminders).toHaveLength(1);
    expect(reminders[0].occurrence).toBe(TODAY);
  });

  it('rappel « 1 jour avant » d’un événement de demain : dû aujourd’hui à 10h00, pas à 9h59', () => {
    const e = ev({ date: '2026-11-21', reminderMinutes: 1440 });
    expect(computeDueReminders([e], [], settings(), at(9, 59), emptyRappelState()).reminders).toHaveLength(0);
    const { reminders } = computeDueReminders([e], [], settings(), at(10, 0), emptyRappelState());
    expect(reminders).toHaveLength(1);
    expect(reminders[0].occurrence).toBe('2026-11-21');
  });
});

describe('Rappels — anti-doublons (tampon persisté)', () => {
  it('une fois notifié, plus jamais re-notifié (même après « réouverture » = nouvel état chargé)', () => {
    const e = ev();
    const s0 = emptyRappelState();
    const { reminders } = computeDueReminders([e], [], settings(), at(9, 50), s0);
    expect(reminders).toHaveLength(1);
    const s1 = applyShown(s0, reminders[0]);
    expect(computeDueReminders([e], [], settings(), at(9, 50), s1).reminders).toHaveLength(0);
    expect(computeDueReminders([e], [], settings(), at(9, 55), s1).reminders).toHaveLength(0);
  });

  it('tampon persisté dans localStorage : recharge -> toujours protégé', () => {
    const e = ev();
    const { reminders } = computeDueReminders([e], [], settings(), at(9, 50), emptyRappelState());
    saveRappelState(applyShown(emptyRappelState(), reminders[0]));
    const recharge = loadRappelState();
    expect(computeDueReminders([e], [], settings(), at(9, 50), recharge).reminders).toHaveLength(0);
  });

  it('« Terminé » : l’occurrence ne sera plus jamais notifiée, même avant l’heure du rappel', () => {
    const e = ev();
    const key = occurrenceKey('e1', TODAY);
    const s = markOccurrenceDone(emptyRappelState(), key);
    expect(computeDueReminders([e], [], settings(), at(9, 30), s).reminders).toHaveLength(0);
    expect(computeDueReminders([e], [], settings(), at(9, 50), s).reminders).toHaveLength(0);
  });

  it('événement supprimé avant le rappel : aucune notification fantôme', () => {
    const e = ev();
    // le rappel était dû…
    expect(computeDueReminders([e], [], settings(), at(9, 50), emptyRappelState()).reminders).toHaveLength(1);
    // …puis l'événement est supprimé : il n'est plus dans la liste, donc plus rien
    expect(computeDueReminders([], [], settings(), at(9, 50), emptyRappelState()).reminders).toHaveLength(0);
  });
});

describe('Rappels — « Reporter de 5 min » (snooze)', () => {
  it('reprogramme UNE fois : pas de notif à 9h55, une notif à 9h56, puis plus rien', () => {
    const e = ev();
    const key = occurrenceKey('e1', TODAY);
    // notifié à 9h50, puis « Reporter de 5 min » à 9h51
    let s = applyShown(emptyRappelState(), {
      kind: 'event', event: e, occurrence: TODAY, key, genKey: key, snoozed: false,
    } as DueEventReminder);
    s = snoozeOccurrence(s, key, at(9, 51).getTime());
    expect(s.snoozes[key]).toBe(at(9, 56).getTime());
    // l'ancien créneau est consommé
    expect(computeDueReminders([e], [], settings(), at(9, 50), s).reminders).toHaveLength(0);
    // avant le report : rien
    expect(computeDueReminders([e], [], settings(), at(9, 55), s).reminders).toHaveLength(0);
    // à l'heure reportée : dû, marqué « reporté », clé de génération distincte
    const { reminders } = computeDueReminders([e], [], settings(), at(9, 56), s);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].snoozed).toBe(true);
    expect(reminders[0].genKey).toBe(`${key}#${at(9, 56).getTime()}`);
    // notifié à 9h56 : plus rien ensuite
    const s2 = applyShown(s, reminders[0]);
    expect(computeDueReminders([e], [], settings(), at(9, 57), s2).reminders).toHaveLength(0);
  });

  it('snooze idempotent (double clic) : ne recule pas deux fois', () => {
    const key = occurrenceKey('e1', TODAY);
    let s = snoozeOccurrence(emptyRappelState(), key, at(9, 51).getTime());
    s = snoozeOccurrence(s, key, at(9, 51, 30).getTime());
    expect(s.snoozes[key]).toBe(at(9, 56).getTime());
  });

  it('report au-delà du début de l’événement : aucune notification (l’événement a commencé)', () => {
    const e = ev(); // 10h00
    const key = occurrenceKey('e1', TODAY);
    const s = snoozeOccurrence(emptyRappelState(), key, at(9, 58).getTime()); // report -> 10h03
    expect(computeDueReminders([e], [], settings(), at(10, 3), s).reminders).toHaveLength(0);
  });
});

describe('Rappels — rappel des tâches du jour', () => {
  it('à 9h00 avec 2 tâches non terminées : récapitulatif « Il te reste 2 tâches aujourd’hui »', () => {
    const tasks = [taskToday(false), taskToday(false), taskToday(true)];
    const { tasks: due } = computeDueReminders([], tasks, settings(), at(9, 0), emptyRappelState());
    expect(due).toEqual({ kind: 'tasks', count: 2, date: TODAY });
  });

  it('pas avant l’heure réglée (8h59) ; rien si tout est terminé ; rien si désactivé', () => {
    const tasks = [taskToday(false)];
    expect(computeDueReminders([], tasks, settings(), at(8, 59), emptyRappelState()).tasks).toBeNull();
    expect(computeDueReminders([], [taskToday(true)], settings(), at(9, 0), emptyRappelState()).tasks).toBeNull();
    expect(computeDueReminders([], tasks, settings({ tasksReminder: false }), at(9, 0), emptyRappelState()).tasks).toBeNull();
    expect(computeDueReminders([], tasks, settings({ tasksReminderTime: '18:30' }), at(9, 0), emptyRappelState()).tasks).toBeNull();
    expect(computeDueReminders([], tasks, settings({ tasksReminderTime: '18:30' }), at(18, 30), emptyRappelState()).tasks).not.toBeNull();
  });

  it('une seule fois par jour (tachesDate tamponné)', () => {
    const tasks = [taskToday(false)];
    const s = { ...emptyRappelState(), tachesDate: TODAY };
    expect(computeDueReminders([], tasks, settings(), at(9, 0), s).tasks).toBeNull();
    expect(computeDueReminders([], tasks, settings(), at(15, 0), s).tasks).toBeNull();
  });

  it('tâches d’un autre jour ignorées', () => {
    const autre = { ...taskToday(false), date: '2026-11-21' };
    expect(computeDueReminders([], [autre], settings(), at(9, 0), emptyRappelState()).tasks).toBeNull();
  });
});

describe('Rappels — contenu des notifications (100 % FR)', () => {
  it('événement : titre = nom de l’événement, texte = heure + catégorie', () => {
    const r: DueEventReminder = { kind: 'event', event: ev(), occurrence: TODAY, key: occurrenceKey('e1', TODAY), genKey: occurrenceKey('e1', TODAY), snoozed: false };
    const n = buildEventNotification(r, true);
    expect(n.title).toBe('Réunion équipe');
    expect(n.body).toContain('10h00');
    expect(n.body).toContain('Travail');
    expect(n.tag).toBe('e1@2026-11-20');
    expect(n.icon).toBe('/icons/icon-192.png');
    expect(n.data).toEqual({ key: 'e1@2026-11-20', eventId: 'e1' });
    expect(n.actions).toEqual([
      { action: 'done', title: 'Terminé' },
      { action: 'snooze', title: 'Reporter de 5 min' },
    ]);
  });

  it('sans actions supportées : pas de boutons (le toast dans l’app prend le relais)', () => {
    const r: DueEventReminder = { kind: 'event', event: ev(), occurrence: TODAY, key: 'k', genKey: 'k', snoozed: false };
    expect(buildEventNotification(r, false).actions).toBeUndefined();
  });

  it('occurrence d’un autre jour : le jour est ajouté au texte', () => {
    const r: DueEventReminder = { kind: 'event', event: ev({ date: '2026-11-21' }), occurrence: '2026-11-21', key: 'k2', genKey: 'k2', snoozed: true };
    const n = buildEventNotification(r, false);
    expect(n.body).toContain('10h00');
    expect(n.body).toContain('Travail');
    expect(n.body).toContain('reporté');
    expect(n.body).not.toContain('À 10h00'); // préfixe « À » réservé à aujourd’hui
  });

  it('tâches : titre récapitulatif en français', () => {
    const n = buildTasksNotification(3, TODAY);
    expect(n.title).toBe('Il te reste 3 tâches aujourd’hui');
    expect(n.tag).toBe(`taches@${TODAY}`);
    expect(n.actions).toBeUndefined();
  });
});

describe('Rappels — paramètre d’URL du clic notification', () => {
  it('parse ?rappel=voir:<id> / fait:<clé> / reporter:<clé>', () => {
    expect(parseRappelParam('?rappel=voir:e1')).toEqual({ kind: 'voir', value: 'e1' });
    expect(parseRappelParam('?rappel=fait:e1%402026-11-20')).toEqual({ kind: 'fait', value: 'e1@2026-11-20' });
    expect(parseRappelParam('?rappel=reporter:e1%402026-11-20')).toEqual({ kind: 'reporter', value: 'e1@2026-11-20' });
    expect(parseRappelParam('?foo=bar')).toBeNull();
    expect(parseRappelParam('?rappel=')).toBeNull();
    expect(parseRappelParam('?rappel=bizarre:x')).toBeNull();
  });
});

describe('Rappels — tampon localStorage (sanitize des deux côtés)', () => {
  it('état corrompu -> état neuf, aucun crash', () => {
    window.localStorage.setItem(RAPPEL_STATE_KEY, 'pas du json{{{');
    expect(loadRappelState()).toEqual(emptyRappelState());
    window.localStorage.setItem(RAPPEL_STATE_KEY, JSON.stringify({ notifies: ['a', 42, null], fait: 'x', snoozes: { k: 'no' }, tachesDate: 7 }));
    const s = loadRappelState();
    expect(s.notifies).toEqual(['a']);
    expect(s.fait).toEqual([]);
    expect(s.snoozes).toEqual({});
    expect(s.tachesDate).toBe('');
  });

  it('sanitizeRappelState garde les entrées valides', () => {
    const s = sanitizeRappelState({ notifies: ['k1'], fait: ['k2'], snoozes: { k3: 123 }, tachesDate: '2026-11-20' });
    expect(s).toEqual({ notifies: ['k1'], fait: ['k2'], snoozes: { k3: 123 }, tachesDate: '2026-11-20' });
  });

  it('prune : les occurrences d’il y a plus de 3 jours sont oubliées', () => {
    const s = sanitizeRappelState({ notifies: ['e1@2026-11-10', 'e2@2026-11-20'], fait: ['e1@2026-11-10'], snoozes: { 'e1@2026-11-10': Date.now() } });
    const p = pruneRappelState(s, TODAY, at(9, 50).getTime());
    expect(p.notifies).toEqual(['e2@2026-11-20']);
    expect(p.fait).toEqual([]);
    expect(p.snoozes).toEqual({});
  });
});

describe('Rappels — schéma, sanitize & migrations (intactes)', () => {
  it('sanitizeEvents : reminderMinutes valide conservé, invalide réparé en null, absent laissé absent', () => {
    const [ok] = sanitizeEvents([{ id: 'a', title: 'A', date: TODAY, start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais', createdAt: 1, reminderMinutes: 30 }]);
    expect(ok.reminderMinutes).toBe(30);
    const [ko] = sanitizeEvents([{ id: 'b', title: 'B', date: TODAY, start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais', createdAt: 1, reminderMinutes: 7 }]);
    expect(ko.reminderMinutes).toBeNull();
    const [txt] = sanitizeEvents([{ id: 'c', title: 'C', date: TODAY, start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais', createdAt: 1, reminderMinutes: '10' }]);
    expect(txt.reminderMinutes).toBeNull();
    const [absent] = sanitizeEvents([{ id: 'd', title: 'D', date: TODAY, start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais', createdAt: 1 }]);
    expect(absent.reminderMinutes).toBeUndefined(); // pas de clé ajoutée : toEqual des anciens tests intact
    const [nul] = sanitizeEvents([{ id: 'e', title: 'E', date: TODAY, start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais', createdAt: 1, reminderMinutes: null }]);
    expect(nul.reminderMinutes).toBeNull();
  });

  it('sanitizeSettings : défauts rappels (activés, 10 min, tâches à 9h00) et bornage des valeurs invalides', () => {
    const d = sanitizeSettings({});
    expect(d.reminders).toBe(true);
    expect(d.reminderDefaultMinutes).toBe(10);
    expect(d.tasksReminder).toBe(true);
    expect(d.tasksReminderTime).toBe('09:00');
    const ko = sanitizeSettings({ reminders: 'oui', reminderDefaultMinutes: 7, tasksReminder: 1, tasksReminderTime: '99:99' });
    expect(ko.reminders).toBe(true); // défaut sûr
    expect(ko.reminderDefaultMinutes).toBe(10);
    expect(ko.tasksReminder).toBe(true);
    expect(ko.tasksReminderTime).toBe('09:00');
    const ok = sanitizeSettings({ reminders: false, reminderDefaultMinutes: 1440, tasksReminder: false, tasksReminderTime: '18:30' });
    expect(ok.reminders).toBe(false);
    expect(ok.reminderDefaultMinutes).toBe(1440);
    expect(ok.tasksReminder).toBe(false);
    expect(ok.tasksReminderTime).toBe('18:30');
  });

  it('migration v1 -> v2 intacte : les nouveaux réglages prennent leurs défauts, version toujours 2', async () => {
    window.localStorage.setItem(
      'centeryou-v1',
      JSON.stringify({
        state: {
          events: [{ id: 'e1', title: 'Réunion', date: '2025-01-06', start: '10:00', end: '11:00', category: 'travail', repeat: 'jamais', createdAt: 1 }],
          tasks: [],
          settings: { prenom: 'Camille' },
        },
        version: 1,
      }),
    );
    await useStore.persist.rehydrate();
    const s = useStore.getState();
    expect(s.settings.prenom).toBe('Camille');
    expect(s.settings.onboarded).toBe(true); // migration v1->v2 toujours appliquée
    expect(s.settings.reminders).toBe(true);
    expect(s.settings.reminderDefaultMinutes).toBe(10);
    expect(s.settings.tasksReminder).toBe(true);
    expect(s.settings.tasksReminderTime).toBe('09:00');
    expect(useStore.persist.getOptions().version).toBe(2); // aucune migration cassée
  });

  it('sauvegarde JSON : le rappel d’événement survit à l’export/import (sanitize des deux côtés)', () => {
    const e = ev({ reminderMinutes: 60 });
    const json = serializeBackup({ events: [e], tasks: [], settings: defaultSettings });
    const back = parseBackup(json);
    expect(back.events[0].reminderMinutes).toBe(60);
    const payload = buildBackupPayload({ events: [ev({ reminderMinutes: 1440 })], tasks: [], settings: defaultSettings });
    expect(JSON.parse(JSON.stringify(payload)).events[0].reminderMinutes).toBe(1440);
  });
});
