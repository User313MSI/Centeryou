import { describe, expect, it } from 'vitest';
import { calendarMonthOnDate, calendarOnDate, eventOccursOn, eventsOnDate, findConflict, overlaps } from '../src/lib/events';
import type { EventItem, TaskItem } from '../src/types';

const base: EventItem = { id: 'e1', title: 'Réunion', date: '2025-01-06', start: '10:00', end: '11:00', category: 'travail', repeat: 'jamais', createdAt: 1 };

describe('conflits et chevauchements', () => {
  it('overlaps', () => {
    expect(overlaps('10:00', '11:00', '10:30', '11:30')).toBe(true);
    expect(overlaps('10:00', '11:00', '11:00', '12:00')).toBe(false); // mitoyen = ok
    expect(overlaps('10:00', '11:00', '09:00', '10:00')).toBe(false);
  });

  it('findConflict détecte doublon exact et chevauchement partiel', () => {
    expect(findConflict([base], { date: '2025-01-06', start: '10:00', end: '11:00' })?.exact).toBe(true);
    expect(findConflict([base], { date: '2025-01-06', start: '10:30', end: '11:30' })?.exact).toBe(false);
    expect(findConflict([base], { date: '2025-01-06', start: '11:00', end: '12:00' })).toBeNull();
    expect(findConflict([base], { date: '2025-01-07', start: '10:00', end: '11:00' })).toBeNull();
  });

  it('findConflict ignore l’événement en cours d’édition', () => {
    expect(findConflict([base], { date: '2025-01-06', start: '10:00', end: '11:00' }, 'e1')).toBeNull();
  });
});

describe('récurrence', () => {
  it('jamais / jour / semaine / mois', () => {
    expect(eventOccursOn(base, '2025-01-06')).toBe(true);
    expect(eventOccursOn(base, '2025-01-07')).toBe(false);
    expect(eventsOnDate([{ ...base, repeat: 'jour' }], '2025-03-01')).toHaveLength(1);
    expect(eventsOnDate([{ ...base, repeat: 'semaine' }], '2025-01-13')).toHaveLength(1);
    expect(eventsOnDate([{ ...base, repeat: 'semaine' }], '2025-01-14')).toHaveLength(0);
    // M-08 : un 31 avec « chaque mois » est aussi présent les mois courts (clamp au
    // dernier jour du mois, comme addMonthsISO) — avant : absent de février
    expect(eventsOnDate([{ ...base, date: '2025-01-31', repeat: 'mois' }], '2025-02-28')).toHaveLength(1);
    expect(eventsOnDate([{ ...base, date: '2025-01-15', repeat: 'mois' }], '2025-02-15')).toHaveLength(1);
  });

  it('mois sur un 31 : clamp au dernier jour du mois (M-08)', () => {
    const ev31 = { ...base, date: '2025-01-31', repeat: 'mois' as const };
    expect(eventOccursOn(ev31, '2025-02-28')).toBe(true); // février non bissextile
    expect(eventOccursOn(ev31, '2025-02-27')).toBe(false);
    expect(eventOccursOn(ev31, '2025-03-31')).toBe(true); // mois avec 31 jours
    expect(eventOccursOn(ev31, '2025-04-30')).toBe(true); // avril a 30 jours
    expect(eventOccursOn(ev31, '2025-04-29')).toBe(false);
    expect(eventOccursOn(ev31, '2024-12-31')).toBe(false); // avant la date de référence
  });

  it('mois sur un 29 février (bissextile) : clamp les années suivantes (M-08)', () => {
    const ev29 = { ...base, date: '2024-02-29', repeat: 'mois' as const };
    expect(eventOccursOn(ev29, '2028-02-29')).toBe(true); // bissextile
    expect(eventOccursOn(ev29, '2028-02-28')).toBe(false);
    expect(eventOccursOn(ev29, '2025-02-28')).toBe(true); // année non bissextile suivante
    expect(eventOccursOn(ev29, '2025-02-27')).toBe(false);
    expect(eventOccursOn(ev29, '2025-03-29')).toBe(true); // mars a 31 jours
  });

  it('mois sur un jour normal : inchangé (M-08)', () => {
    const ev15 = { ...base, date: '2025-01-15', repeat: 'mois' as const };
    expect(eventOccursOn(ev15, '2025-03-15')).toBe(true);
    expect(eventOccursOn(ev15, '2025-03-14')).toBe(false);
    expect(eventOccursOn(ev15, '2024-12-15')).toBe(false);
  });

  it('rien avant la date de référence, même avec récurrence', () => {
    expect(eventOccursOn({ ...base, repeat: 'jour' }, '2025-01-05')).toBe(false);
  });
});

describe('vues calendrier', () => {
  const taskWithTime: TaskItem = { id: 't1', title: 'Sport', date: '2025-01-07', time: '14:00', category: 'perso', priority: 'moyenne', done: false, createdAt: 2 };
  const taskNoTime: TaskItem = { id: 't2', title: 'Rapport', date: '2025-01-10', time: null, category: 'autre', priority: 'moyenne', done: false, createdAt: 3 };
  const ev7 = { ...base, id: 'e7', date: '2025-01-07' };

  it('Jour/Semaine : tâches avec heure positionnées, triées par heure', () => {
    const items = calendarOnDate([ev7], [taskWithTime, taskNoTime], '2025-01-07');
    expect(items.map((i) => `${i.kind}:${i.title}@${i.start}`)).toEqual(['event:Réunion@10:00', 'task:Sport@14:00']);
  });

  it('tâche sans heure absente de la grille horaire, visible en vue Mois', () => {
    expect(calendarOnDate([], [taskNoTime], '2025-01-10')).toHaveLength(0);
    expect(calendarMonthOnDate([], [taskNoTime], '2025-01-10').map((i) => `${i.kind}:${i.title}`)).toEqual(['task:Rapport']);
    expect(calendarMonthOnDate([], [taskWithTime], '2025-01-07').map((i) => `${i.kind}:${i.title}`)).toEqual(['task:Sport']);
  });

  it('tâche avec heure dure 1 h par défaut', () => {
    const items = calendarOnDate([], [taskWithTime], '2025-01-07');
    expect(items[0].end).toBe('15:00');
  });
});
