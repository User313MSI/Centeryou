import type { EventItem, LaunchFilmMode, TaskItem } from '../types';

import { buildBriefText } from './brief';

import { calendarOnDate, type CalendarInstance } from './events';

import {
  addDaysISO,
  capitalize,
  endMinutesOf,
  formatDayLong,
  formatTimeFr,
  greetingFor,
  minutesOf,
  nowMinutes,
  startOfWeekISO,
  todayISO,
} from './dates';

import { completionRate, formatHoursFr, organizedStreak } from './stats';

/**
 * Film de lancement (Réalisateur, M-06) — logique pure, testable en node.
 *
 * Le film SUBLIME la séquence d'accueil existante : la fréquence historique
 * (`welcomeSequence` / `welcomeShownDate`) reste un verrou (un utilisateur qui
 * avait choisi « désactivée » ne voit pas le film), et le nouveau réglage
 * « Film de lancement » (`launchFilm` / `launchFilmShownDate`) s'ajoute par-dessus.
 */

/**
 * Décide si le film de lancement doit jouer à l'ouverture.
 * - 'off' : jamais ;
 * - 'daily' (défaut) : une fois par jour (si déjà joué aujourd'hui, non) ;
 * - 'always' : à chaque ouverture.
 */
export function shouldShowLaunchFilm(
  mode: LaunchFilmMode | undefined,
  shownDate: string,
  today: string,
): boolean {
  const m = mode ?? 'daily';
  if (m === 'off') return false;
  if (m === 'daily' && shownDate === today) return false;
  return true;
}

/** le film peut être audible : assistant vocal actif ET bascule « voix du film » active */
export function launchFilmVoiceWanted(settings: { voice: boolean; launchFilmVoice?: boolean }): boolean {
  return settings.voice === true && (settings.launchFilmVoice ?? true) === true;
}

/** suggestion du jour affichée quand la journée est vide (exemples du parseur) */
export const FILM_SUGGESTION = 'sport demain 14h';

/** mot d'encouragement selon la part de tâches accomplies cette semaine */
export function encouragementFor(weekPercent: number | null): string {
  if (weekPercent === null) return 'Ta première semaine commence aujourd’hui.';
  if (weekPercent >= 80) return 'Quel rythme — continue comme ça.';
  if (weekPercent >= 50) return 'Tu avances bien, bravo.';
  if (weekPercent > 0) return 'Bien parti pour cette semaine.';
  return 'Chaque tâche cochée compte — allez, on s’y met.';
}

export interface FilmData {
  prenom: string;
  greeting: string;
  dateFr: string;
  dayPct: number;
  /** chiffres du jour */
  eventCount: number;
  taskOpen: number;
  taskDone: number;
  taskTotal: number;
  plannedMinutes: number;
  plannedHoursLabel: string;
  /** prochaine étape (carte à halo pulsant) */
  next: CalendarInstance | null;
  emptyDay: boolean;
  suggestion: string;
  /** progression hebdomadaire */
  weekPercent: number | null;
  weekDone: number;
  weekTotal: number;
  streak: number;
  weekDays: { iso: string; done: boolean; today: boolean }[];
  encouragement: string;
  /** scène « magie » : phrase dictée -> carte d'événement */
  magicPhrase: string;
  magicTitle: string;
  magicTimeLabel: string;
  /** narration vocale = texte du brief du matin (source unique, aucun surcoût) */
  briefText: string;
  /** sous-titres, un par scène */
  captions: string[];
}

/**
 * Construit toutes les données réelles du film pour aujourd'hui
 * (chiffres du jour, prochaine étape, progression de la semaine, exemple de magie).
 */
export function buildFilmData(
  events: EventItem[],
  tasks: TaskItem[],
  prenom: string,
  today: string = todayISO(),
  now: number = nowMinutes(),
): FilmData {
  const p = prenom.trim();
  const greeting = greetingFor();
  const dateFr = capitalize(formatDayLong(today));
  const dayPct = Math.max(0, Math.min(100, Math.round((now / (24 * 60)) * 100)));

  const todayItems = calendarOnDate(events, tasks, today);
  const eventCount = todayItems.filter((i) => i.kind === 'event').length;
  const dayTasks = tasks.filter((t) => t.date === today);
  const taskTotal = dayTasks.length;
  const taskDone = dayTasks.filter((t) => t.done).length;
  const taskOpen = taskTotal - taskDone;
  const plannedMinutes = todayItems.reduce(
    (a, i) => a + Math.max(0, endMinutesOf(i.end) - minutesOf(i.start)),
    0,
  );
  const next = todayItems.filter((i) => endMinutesOf(i.end) >= now)[0] ?? null;
  const emptyDay = todayItems.length === 0 && taskOpen === 0;

  const week = completionRate(tasks, today, 7);
  const streak = organizedStreak(tasks, today);
  const start = startOfWeekISO(today);
  const doneDays = new Set(tasks.filter((t) => t.done).map((t) => t.date));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(start, i);
    return { iso, done: doneDays.has(iso), today: iso === today };
  });

  // scène « magie » : un vrai exemple de l'utilisateur s'il a une prochaine étape, sinon l'exemple canonique
  const magicTitle = next ? next.title : 'Sport';
  const magicTimeLabel = next ? formatTimeFr(next.start) : 'demain à 14h00';
  const magicPhrase = next ? `ajoute ${next.title} à ${formatTimeFr(next.start)}` : `ajoute ${FILM_SUGGESTION}`;

  const plannedHoursLabel = formatHoursFr(plannedMinutes);
  const briefText = buildBriefText(p, events, tasks, today);

  const captions: string[] = [
    `${greeting}${p ? `, ${p}` : ''}. Nous sommes le ${dateFr}.`,
    emptyDay
      ? `Journée libre aujourd’hui — une idée pour commencer : « ${FILM_SUGGESTION} ».`
      : `Aujourd’hui : ${eventCount} événement${eventCount > 1 ? 's' : ''}, ${taskOpen} tâche${
          taskOpen > 1 ? 's' : ''
        } à faire, ${plannedHoursLabel} planifiée${plannedMinutes > 60 ? 's' : ''}${
          next ? ` — prochaine étape : ${next.title} à ${formatTimeFr(next.start)}` : ''
        }.`,
    week.percent === null
      ? 'Ta première semaine commence aujourd’hui.'
      : `${week.percent} pour cent des tâches de la semaine sont faites — ${streak} jour${
          streak > 1 ? 's' : ''
        } organisés d’affilée.`,
    `Dis « ${magicPhrase} »… et la carte d’événement apparaît.`,
    `Ton planning qui te parle. Bonne journée${p ? `, ${p}` : ''}.`,
  ];

  return {
    prenom: p,
    greeting,
    dateFr,
    dayPct,
    eventCount,
    taskOpen,
    taskDone,
    taskTotal,
    plannedMinutes,
    plannedHoursLabel,
    next,
    emptyDay,
    suggestion: FILM_SUGGESTION,
    weekPercent: week.percent,
    weekDone: week.done,
    weekTotal: week.total,
    streak,
    weekDays,
    encouragement: encouragementFor(week.percent),
    magicPhrase,
    magicTitle,
    magicTimeLabel,
    briefText,
    captions,
  };
}
