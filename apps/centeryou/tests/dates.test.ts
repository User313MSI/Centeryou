import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  addMonthsISO,
  formatTimeFr,
  minutesOf,
  monthMatrix,
  nextWeekdayISO,
  startOfWeekISO,
  timeOf,
  weekdayOf,
} from '../src/lib/dates';

describe('dates', () => {
  it('weekdayOf : lundi = 0 … dimanche = 6', () => {
    expect(weekdayOf('2025-01-06')).toBe(0);
    expect(weekdayOf('2025-01-12')).toBe(6);
  });

  it('addDaysISO traverse les mois et les années', () => {
    expect(addDaysISO('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDaysISO('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDaysISO('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('addMonthsISO gère les fins de mois', () => {
    expect(addMonthsISO('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonthsISO('2025-01-15', 1)).toBe('2025-02-15');
  });

  it('nextWeekdayISO inclut aujourd’hui', () => {
    expect(nextWeekdayISO(0, '2025-01-06')).toBe('2025-01-06'); // lundi -> lundi même jour
    expect(nextWeekdayISO(2, '2025-01-06')).toBe('2025-01-08'); // mercredi
    expect(nextWeekdayISO(6, '2025-01-06')).toBe('2025-01-12'); // dimanche
  });

  it('startOfWeekISO renvoie le lundi', () => {
    expect(startOfWeekISO('2025-01-08')).toBe('2025-01-06');
    expect(startOfWeekISO('2025-01-06')).toBe('2025-01-06');
  });

  it('timeOf borne entre 00:00 et 23:59', () => {
    expect(timeOf(0)).toBe('00:00');
    expect(timeOf(14 * 60 + 30)).toBe('14:30');
    expect(timeOf(24 * 60)).toBe('23:59');
    expect(timeOf(-5)).toBe('00:00');
  });

  it('minutesOf / formatTimeFr', () => {
    expect(minutesOf('14:30')).toBe(870);
    expect(formatTimeFr('14:30')).toBe('14h30');
    expect(formatTimeFr('09:05')).toBe('09h05');
  });

  it('monthMatrix : 6 semaines x 7 jours, lundi en premier', () => {
    const m = monthMatrix('2025-01-15');
    expect(m).toHaveLength(6);
    for (const week of m) expect(week).toHaveLength(7);
    expect(weekdayOf(m[0][0])).toBe(0);
    expect(m.flat()).toContain('2025-01-15');
  });
});
