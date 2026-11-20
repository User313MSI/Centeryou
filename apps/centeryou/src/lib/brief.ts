import type { EventItem, TaskItem } from '../types';

import { eventsOnDate } from './events';

import { formatTimeFr, greetingFor } from './dates';

/**
 * Texte du brief du matin — SOURCE UNIQUE, partagée entre la carte
 * « Ton brief du matin » (BriefCard) et la voix du film de lancement :
 * le film réutilise ce texte tel quel (il ne le recalcule pas, ne le double
 * pas — aucun surcoût de quota premium).
 */
export function buildBriefText(prenom: string, events: EventItem[], tasks: TaskItem[], today: string): string {
  const evs = eventsOnDate(events, today);
  const dayTasks = tasks.filter((t) => t.date === today);
  const done = dayTasks.filter((t) => t.done).length;
  const p = prenom.trim();
  const phrases = [
    `${greetingFor()}${p ? ` ${p}` : ''}.`,
    evs.length > 0
      ? `Aujourd’hui, tu as ${evs.length} événement${evs.length > 1 ? 's' : ''}${
          evs[0] ? ` — le premier à ${formatTimeFr(evs[0].start)} : ${evs[0].event.title}` : ''
        }.`
      : "Côté agenda, ta journée est libre aujourd’hui.",
    dayTasks.length > 0
      ? `${done} tâche${done > 1 ? 's' : ''} sur ${dayTasks.length} déjà accomplie${done > 1 ? 's' : ''}.`
      : "Aucune tâche n’est prévue aujourd’hui.",
  ];
  return phrases.join(' ');
}
