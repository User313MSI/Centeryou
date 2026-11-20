import { describe, expect, it } from 'vitest';
import type { EventItem, TaskItem } from '../src/types';
import { addDaysISO, startOfWeekISO, weekdayOf } from '../src/lib/dates';
import {
  buildInsight,
  busiestWeekday,
  categoryDistribution,
  completionRate,
  computeStats,
  deltaPercent,
  eventMinutes,
  formatDeltaFr,
  formatHoursFr,
  organizedStreak,
  STATS_HABIT_DAYS,
  STATS_WEEKS,
  statsWeeks,
  weekdayMinutes,
} from '../src/lib/stats';

const TODAY = '2025-11-19'; // mercredi
const MONDAY = startOfWeekISO(TODAY); // lundi de la semaine en cours

let seq = 0;
function ev(partial: Partial<EventItem> & { title: string }): EventItem {
  seq += 1;
  return {
    id: `e${seq}`,
    date: MONDAY,
    start: '09:00',
    end: '10:00',
    category: 'travail',
    repeat: 'jamais',
    createdAt: seq,
    ...partial,
  };
}
function task(partial: Partial<TaskItem> & { title: string }): TaskItem {
  seq += 1;
  return {
    id: `t${seq}`,
    date: TODAY,
    time: null,
    category: 'perso',
    priority: 'moyenne',
    done: false,
    createdAt: seq,
    ...partial,
  };
}

describe('stats — durées', () => {
  it('eventMinutes : durée simple, fin « 00:00 » = 24h00, fin avant début bornée à 0', () => {
    expect(eventMinutes(ev({ title: 'a', start: '09:00', end: '10:30' }))).toBe(90);
    expect(eventMinutes(ev({ title: 'b', start: '22:00', end: '00:00' }))).toBe(120);
    expect(eventMinutes(ev({ title: 'c', start: '10:00', end: '09:00' }))).toBe(0);
  });

  it('formatHoursFr / formatDeltaFr : libellés français', () => {
    expect(formatHoursFr(0)).toBe('0 h');
    expect(formatHoursFr(120)).toBe('2 h');
    expect(formatHoursFr(150)).toBe('2 h 30');
    expect(formatHoursFr(45)).toBe('0 h 45');
    expect(formatDeltaFr(25)).toBe('+25 %');
    expect(formatDeltaFr(-10)).toBe('−10 %');
    expect(formatDeltaFr(0)).toBe('stable');
    expect(formatDeltaFr(null)).toBe('—');
  });
});

describe('stats — semaines', () => {
  it('statsWeeks : 4 semaines ordonnées, répétitions développées jour par jour, semaine en cours en dernier', () => {
    const events = [
      ev({ title: 'hebdo', date: addDaysISO(MONDAY, -21), start: '09:00', end: '11:00', repeat: 'semaine', category: 'travail' }),
      ev({ title: 'ponctuel', date: MONDAY, start: '18:00', end: '19:00', repeat: 'jamais', category: 'sante' }),
      ev({ title: 'quotidien', date: MONDAY, start: '08:00', end: '09:00', repeat: 'jour', category: 'perso' }),
    ];
    const weeks = statsWeeks(events, TODAY);
    expect(weeks).toHaveLength(STATS_WEEKS);
    expect(weeks[0].start).toBe(addDaysISO(MONDAY, -21));
    expect(weeks[STATS_WEEKS - 1].start).toBe(MONDAY);
    expect(weeks.every((w) => weekdayOf(w.start) === 0)).toBe(true); // chaque semaine commence un lundi
    expect(weeks[STATS_WEEKS - 1].label).toContain('nov');
    const current = weeks[STATS_WEEKS - 1];
    expect(current.byCategory.travail).toBe(120); // 2 h ce lundi
    expect(current.byCategory.sante).toBe(60); // 1 h ce lundi uniquement
    expect(current.byCategory.perso).toBe(420); // répétition « jour » : 1 h x 7 jours cette semaine
    expect(current.totalMinutes).toBe(600);
    const previous = weeks[STATS_WEEKS - 2];
    expect(previous.totalMinutes).toBe(120); // seul l'hebdomadaire
    expect(previous.byCategory.sante).toBe(0);
    expect(previous.byCategory.perso).toBe(0); // le quotidien commence cette semaine
  });

  it('deltaPercent : ± % arrondi, null si la semaine précédente est vide', () => {
    expect(deltaPercent(125, 100)).toBe(25);
    expect(deltaPercent(50, 100)).toBe(-50);
    expect(deltaPercent(100, 100)).toBe(0);
    expect(deltaPercent(10, 0)).toBeNull();
    expect(deltaPercent(0, 0)).toBeNull();
  });
});

describe('stats — habitudes', () => {
  it('weekdayMinutes / busiestWeekday : jour le plus chargé sur les 28 derniers jours', () => {
    expect(STATS_HABIT_DAYS).toBe(28);
    const events = [
      ev({ title: 'lundi', date: addDaysISO(MONDAY, -28), start: '09:00', end: '11:00', repeat: 'semaine', category: 'travail' }),
      ev({ title: 'mercredi', date: addDaysISO(MONDAY, -26), start: '09:00', end: '12:00', repeat: 'semaine', category: 'focus' }),
    ];
    const perDay = weekdayMinutes(events, TODAY);
    expect(perDay).toHaveLength(7);
    expect(perDay[0]).toBe(480); // 4 lundis x 2 h
    expect(perDay[2]).toBe(720); // 4 mercredis x 3 h
    expect(perDay[6]).toBe(0);
    expect(busiestWeekday(events, TODAY)).toEqual({ index: 2, minutes: 720 });
    expect(busiestWeekday([], TODAY)).toBeNull();
  });

  it('categoryDistribution : minutes par catégorie sur 28 jours, catégories à 0 exclues, ordre fixe', () => {
    const events = [
      ev({ title: 'a', date: MONDAY, start: '09:00', end: '10:30', repeat: 'jamais', category: 'travail' }),
      ev({ title: 'b', date: addDaysISO(MONDAY, -21), start: '11:00', end: '12:00', repeat: 'semaine', category: 'perso' }),
    ];
    const dist = categoryDistribution(events, TODAY);
    expect(dist.map((d) => d.category)).toEqual(['travail', 'perso']);
    expect(dist[0].minutes).toBe(90);
    expect(dist[1].minutes).toBe(240); // 4 lundis x 1 h
    expect(categoryDistribution([], TODAY)).toEqual([]);
  });
});

describe('stats — tâches', () => {
  it('completionRate : fenêtre glissante 7 / 30 jours, passé lointain et futur exclus, null si vide', () => {
    const tasks = [
      task({ title: 't1', date: TODAY, done: true }),
      task({ title: 't2', date: addDaysISO(TODAY, -3), done: true }),
      task({ title: 't3', date: addDaysISO(TODAY, -6), done: false }),
      task({ title: 't4', date: addDaysISO(TODAY, -10), done: true }),
      task({ title: 't5', date: addDaysISO(TODAY, -40), done: true }),
      task({ title: 't6', date: addDaysISO(TODAY, 2), done: true }), // futur : exclu
    ];
    const c7 = completionRate(tasks, TODAY, 7);
    expect(c7.total).toBe(3);
    expect(c7.done).toBe(2);
    expect(c7.percent).toBe(67);
    const c30 = completionRate(tasks, TODAY, 30);
    expect(c30.total).toBe(4);
    expect(c30.done).toBe(3);
    expect(c30.percent).toBe(75);
    const empty = completionRate([], TODAY, 7);
    expect(empty.total).toBe(0);
    expect(empty.done).toBe(0);
    expect(empty.percent).toBeNull();
  });

  it('organizedStreak : série depuis aujourd’hui, depuis hier si aujourd’hui est vide, rupture sinon', () => {
    const d = (n: number) => addDaysISO(TODAY, -n);
    expect(
      organizedStreak(
        [
          task({ title: 'a', date: d(0), done: true }),
          task({ title: 'b', date: d(1), done: true }),
          task({ title: 'c', date: d(2), done: true }),
        ],
        TODAY,
      ),
    ).toBe(3);
    // aujourd’hui sans tâche accomplie : la série vivante continue depuis hier
    expect(
      organizedStreak(
        [
          task({ title: 'a', date: d(1), done: true }),
          task({ title: 'b', date: d(2), done: true }),
        ],
        TODAY,
      ),
    ).toBe(2);
    // trou avant-hier -> série rompue
    expect(organizedStreak([task({ title: 'a', date: d(3), done: true })], TODAY)).toBe(0);
    // aucune tâche accomplie -> 0
    expect(organizedStreak([task({ title: 'a', date: d(0), done: false })], TODAY)).toBe(0);
    // tâche accomplie seulement dans le futur -> 0
    expect(organizedStreak([task({ title: 'a', date: addDaysISO(TODAY, 2), done: true })], TODAY)).toBe(0);
    expect(organizedStreak([], TODAY)).toBe(0);
  });
});

describe('stats — insight écrit', () => {
  it('buildInsight : chaîne vide sans données, sinon 2-3 phrases calculées (jour chargé, catégorie, tâches)', () => {
    expect(buildInsight([], [], TODAY)).toBe('');
    const events = [
      ev({ title: 'lundi', date: addDaysISO(MONDAY, -28), start: '09:00', end: '11:00', repeat: 'semaine', category: 'travail' }),
      ev({ title: 'sport', date: MONDAY, start: '18:00', end: '20:00', repeat: 'jamais', category: 'sante' }),
    ];
    const tasks = [
      task({ title: 't1', date: TODAY, done: true }),
      task({ title: 't2', date: TODAY, done: false }),
      task({ title: 't3', date: addDaysISO(TODAY, -1), done: false }),
    ];
    const text = buildInsight(events, tasks, TODAY);
    expect(text).toContain('Ta journée la plus chargée : lundi');
    expect(text).toContain('Santé progresse de 2 h cette semaine');
    expect(text).toContain('33 % de tes tâches sont accomplies'); // 1 accompli sur 3
    expect(text.split('.').length - 1).toBeLessThanOrEqual(3); // jamais plus de 3 phrases
  });

  it('buildInsight : catégorie en baisse -> « recule de » (ton neutre)', () => {
    const events = [
      ev({ title: 'hebdo', date: addDaysISO(MONDAY, -21), start: '09:00', end: '10:00', repeat: 'semaine', category: 'travail' }),
      ev({ title: 'ponctuel', date: addDaysISO(MONDAY, -7), start: '09:00', end: '12:00', repeat: 'jamais', category: 'focus' }),
    ];
    const text = buildInsight(events, [], TODAY);
    expect(text).toContain('Focus recule de 3 h cette semaine');
    expect(text).toContain('Aucune tâche sur les 7 derniers jours');
  });
});

describe('stats — computeStats (intégration)', () => {
  it('agrège toutes les stats, hasData et delta de la semaine en cours', () => {
    const empty = computeStats([], [], TODAY);
    expect(empty.hasData).toBe(false);
    expect(empty.insight).toBe('');

    const events = [
      ev({ title: 'hebdo', date: addDaysISO(MONDAY, -21), start: '09:00', end: '11:00', repeat: 'semaine', category: 'travail' }),
      ev({ title: 'ponctuel', date: MONDAY, start: '18:00', end: '19:00', repeat: 'jamais', category: 'sante' }),
    ];
    const s = computeStats(events, [task({ title: 't', date: TODAY, done: true })], TODAY);
    expect(s.hasData).toBe(true);
    expect(s.weeks).toHaveLength(STATS_WEEKS);
    expect(s.weekDelta).toBe(50); // 180 min cette semaine vs 120 la semaine précédente
    expect(s.totalMinutes).toBe(540); // 4 x 120 (travail) + 60 (santé)
    expect(s.busiest?.index).toBe(0); // lundi
    expect(s.distribution.map((x) => x.category)).toEqual(['travail', 'sante']);
    expect(s.completion7).toEqual({ done: 1, total: 1, percent: 100 });
    expect(s.streak).toBe(1);
    expect(s.insight.length).toBeGreaterThan(0);
  });
});
