import { describe, expect, it } from 'vitest';

import { addDaysISO, minutesOf } from '../src/lib/dates';
import { eventsOnDate, overlaps } from '../src/lib/events';
import { busyIntervals, dayGaps, preferredStartMinutes, slotLabel, suggestSlots } from '../src/lib/radar';
import type { Category, EventItem, Repeat } from '../src/types';

const D = '2026-11-23'; // un lundi

function ev(
  id: string,
  date: string,
  start: string,
  end: string,
  opts: { category?: Category; repeat?: Repeat } = {},
): EventItem {
  return {
    id,
    title: `Événement ${id}`,
    date,
    start,
    end,
    category: opts.category ?? 'autre',
    repeat: opts.repeat ?? 'jamais',
    createdAt: 1,
  };
}

describe('Radar — trous de la journée (détection exacte)', () => {
  it('dayGaps découpe exactement autour des événements', () => {
    const events = [ev('a', D, '10:00', '11:00'), ev('b', D, '14:00', '15:00')];
    expect(dayGaps(events, D)).toEqual([
      { start: 480, end: 600 },
      { start: 660, end: 840 },
      { start: 900, end: 1320 },
    ]);
  });

  it('événements mitoyens fusionnés, pas de trou entre les deux', () => {
    const events = [ev('a', D, '10:00', '11:00'), ev('b', D, '11:00', '12:00')];
    expect(dayGaps(events, D)).toEqual([
      { start: 480, end: 600 },
      { start: 720, end: 1320 },
    ]);
  });

  it('événements qui se chevauchent fusionnés (busyIntervals)', () => {
    const events = [ev('a', D, '09:00', '10:30'), ev('b', D, '10:15', '11:00')];
    expect(busyIntervals(events, D)).toEqual([{ start: 540, end: 660 }]);
    expect(dayGaps(events, D)).toEqual([
      { start: 480, end: 540 },
      { start: 660, end: 1320 },
    ]);
  });

  it('fin à « 00:00 » = minuit : occupe jusqu’à 22h00 (fin de fenêtre)', () => {
    const events = [ev('a', D, '20:00', '00:00')];
    expect(dayGaps(events, D)).toEqual([{ start: 480, end: 1200 }]);
  });

  it('journée vide = un seul grand trou 8h00–22h00', () => {
    expect(dayGaps([], D)).toEqual([{ start: 480, end: 1320 }]);
  });
});

describe('Radar — événements de nuit ignorés proprement', () => {
  it('nuit (23h–minuit, minuit–6h, 22h–23h) ne bloque rien dans la fenêtre jour', () => {
    const events = [ev('n1', D, '23:00', '00:00'), ev('n2', D, '00:00', '06:00'), ev('n3', D, '22:00', '23:00')];
    expect(dayGaps(events, D)).toEqual([{ start: 480, end: 1320 }]);
    const slots = suggestSlots({ events, date: D });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].date).toBe(D); // pas de repli sur un autre jour
  });

  it('un événement de 24 h (00:00–00:00 = minuit à minuit) remplit bien la journée → repli le lendemain', () => {
    const events = [ev('n1', D, '00:00', '00:00')];
    expect(dayGaps(events, D)).toEqual([]);
    expect(suggestSlots({ events, date: D })[0]?.date).toBe(addDaysISO(D, 1));
  });
});

describe('Radar — suggestions : jamais de chevauchement', () => {
  const events = [
    ev('a', D, '09:00', '10:30', { category: 'travail' }),
    ev('b', D, '10:15', '11:00', { category: 'travail' }),
    ev('c', D, '12:00', '13:00'),
    ev('d', D, '18:00', '20:00'),
  ];

  it('aucun créneau proposé ne chevauche un événement du jour', () => {
    const slots = suggestSlots({ events, date: D, category: 'travail' });
    expect(slots.length).toBeGreaterThan(0);
    const insts = eventsOnDate(events, D);
    for (const s of slots) {
      expect(minutesOf(s.start)).toBeGreaterThanOrEqual(480);
      expect(minutesOf(s.end)).toBeLessThanOrEqual(1320);
      for (const i of insts) {
        expect(overlaps(s.start, s.end, i.start, i.end)).toBe(false);
      }
    }
  });

  it('récurrence « chaque jour » : le créneau est bloqué tous les jours', () => {
    const daily = [ev('j', D, '10:00', '11:00', { repeat: 'jour' })];
    for (const day of [D, addDaysISO(D, 1), addDaysISO(D, 5)]) {
      const slots = suggestSlots({ events: daily, date: day });
      for (const s of slots) {
        expect(overlaps(s.start, s.end, '10:00', '11:00')).toBe(false);
      }
    }
  });

  it('ignoreId : l’événement en cours d’édition ne se bloque pas lui-même', () => {
    const events = [ev('moi', D, '10:00', '11:00')];
    const withIgnore = suggestSlots({ events, date: D, ignoreId: 'moi' });
    expect(withIgnore.some((s) => s.start === '10:00')).toBe(true);
    const without = suggestSlots({ events, date: D });
    for (const s of without) expect(overlaps(s.start, s.end, '10:00', '11:00')).toBe(false);
  });
});

describe('Radar — journée vide / pleine', () => {
  it('journée vide : 3 créneaux le jour visé, 1 h par défaut, centrés sur 14h00 (défaut sans habitudes)', () => {
    const slots = suggestSlots({ events: [], date: D });
    expect(slots).toHaveLength(3);
    for (const s of slots) {
      expect(s.date).toBe(D);
      expect(minutesOf(s.end) - minutesOf(s.start)).toBe(60);
    }
    expect(slots[0].start).toBe('14:00');
    expect(slots[0].end).toBe('15:00');
  });

  it('journée pleine : propose le jour proche le plus dégagé (D+2 vide bat D+1 partiellement occupé)', () => {
    const events = [
      ev('a', D, '08:00', '12:00'),
      ev('b', D, '12:00', '18:00'),
      ev('c', D, '18:00', '22:00'),
      ev('d', addDaysISO(D, 1), '10:00', '12:00'),
    ];
    const slots = suggestSlots({ events, date: D });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) expect(s.date).toBe(addDaysISO(D, 2));
  });

  it('journée pleine : D+1 plus dégagé que D+2 → c’est D+1 qui est proposé', () => {
    const events = [
      ev('a', D, '08:00', '22:00'),
      ev('d', addDaysISO(D, 1), '10:00', '12:00'), // 720 min libres
      ev('e', addDaysISO(D, 2), '08:00', '20:00'), // 120 min libres
    ];
    const slots = suggestSlots({ events, date: D });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) expect(s.date).toBe(addDaysISO(D, 1));
  });

  it('horizon saturé (7 jours pleins) : aucune suggestion, sans erreur', () => {
    const events: EventItem[] = [];
    for (let i = 0; i <= 7; i += 1) events.push(ev(`f${i}`, addDaysISO(D, i), '08:00', '22:00'));
    expect(suggestSlots({ events, date: D })).toEqual([]);
  });
});

describe('Radar — durée, habitudes, extrêmes, « maintenant »', () => {
  it('durée présumée sur mesure (90 min) : trous < 90 min ignorés, durée respectée', () => {
    const events = [ev('a', D, '10:00', '10:30')];
    const slots = suggestSlots({ events, date: D, durationMinutes: 90 });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(minutesOf(s.end) - minutesOf(s.start)).toBe(90);
      expect(overlaps(s.start, s.end, '10:00', '10:30')).toBe(false);
    }
  });

  it('pondération par catégorie : travail habituel à 9h00 → suggestion à 9h00', () => {
    const events = [
      ev('t1', addDaysISO(D, -3), '09:00', '10:00', { category: 'travail' }),
      ev('t2', addDaysISO(D, -2), '09:30', '10:30', { category: 'travail' }),
      ev('t3', addDaysISO(D, -1), '08:45', '09:45', { category: 'travail' }),
      ev('p1', addDaysISO(D, -1), '18:00', '19:00', { category: 'perso' }),
    ];
    const travail = suggestSlots({ events, date: D, category: 'travail' });
    expect(travail[0].start).toBe('09:00'); // moyenne ~9h05 arrondie à 9h00
    const perso = suggestSlots({ events, date: D, category: 'perso' });
    expect(perso[0].start).toBe('18:00');
  });

  it('preferredStartMinutes : 14h00 sans habitudes, moyenne des débuts sinon (nuit exclue)', () => {
    expect(preferredStartMinutes([])).toBe(14 * 60);
    expect(preferredStartMinutes([ev('a', D, '23:00', '00:00')])).toBe(14 * 60); // nuit exclue
    expect(preferredStartMinutes([ev('a', D, '10:00', '11:00'), ev('b', D, '12:00', '13:00')])).toBe(11 * 60);
  });

  it('évite les extrêmes : jamais de suggestion avant 9h00 ni finissant après 20h00… au pire 22h00 borné', () => {
    const slots = suggestSlots({ events: [], date: D, durationMinutes: 60 });
    for (const s of slots) {
      expect(minutesOf(s.start)).toBeGreaterThanOrEqual(9 * 60);
      expect(minutesOf(s.end)).toBeLessThanOrEqual(20 * 60 + 120); // borne douce, jamais la nuit
    }
  });

  it('« maintenant » : aucun créneau proposé dans le passé aujourd’hui', () => {
    const events = [ev('a', D, '16:00', '17:00')];
    const slots = suggestSlots({ events, date: D, now: { date: D, minutes: 15 * 60 + 7 } }); // 15h07
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(minutesOf(s.start)).toBeGreaterThanOrEqual(15 * 60 + 30); // 15h30, prochain pas de 30 min
      expect(overlaps(s.start, s.end, '16:00', '17:00')).toBe(false);
    }
  });

  it('max 3 suggestions, scores triés décroissants', () => {
    const slots = suggestSlots({ events: [], date: D });
    expect(slots.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < slots.length; i += 1) expect(slots[i].score).toBeLessThanOrEqual(slots[i - 1].score);
  });
});

describe('Radar — libellé FR des pastilles', () => {
  const slot = { date: D, start: '14:00', end: '15:00' };

  it('« aujourd’hui … — libre » le jour même', () => {
    expect(slotLabel(slot, D)).toBe('aujourd’hui 14h00 – 15h00 — libre');
  });

  it('« demain … — libre » le lendemain', () => {
    expect(slotLabel(slot, addDaysISO(D, -1))).toBe('demain 14h00 – 15h00 — libre');
  });

  it('jour de semaine sinon (« lun. 23 nov. … — libre »)', () => {
    const label = slotLabel(slot, addDaysISO(D, -3));
    expect(label).toContain('23 nov.');
    expect(label).toContain('14h00 – 15h00 — libre');
  });
});
