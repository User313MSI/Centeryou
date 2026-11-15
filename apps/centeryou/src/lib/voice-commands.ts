'use client';

import { addDaysISO, formatDayLong, formatTimeFr, minutesOf, timeOf, todayISO } from './dates';
import { eventsOnDate, findConflict } from './events';
import { parseInput } from './parser';
import { useStore } from './store';
import { useUiStore } from './ui-store';
import { normalizeText } from './utils';
import { playBlip, speak } from './voice';

function programSentence(iso: string): string {
  const s = useStore.getState();
  const evs = eventsOnDate(s.events, iso);
  const tasks = s.tasks.filter((t) => t.date === iso);
  const open = tasks.filter((t) => !t.done);
  const prenom = s.settings.prenom.trim();
  const today = todayISO();
  const label = iso === today ? "aujourd'hui" : iso === addDaysISO(today, 1) ? 'demain' : formatDayLong(iso);
  const who = prenom ? `${prenom}, ` : '';
  if (evs.length === 0 && open.length === 0) {
    return `${who}${label} est complètement libre. Profite de cette belle journée !`;
  }
  const parts: string[] = [];
  if (evs.length > 0) {
    const list = evs
      .slice(0, 3)
      .map((e) => `${e.event.title} à ${formatTimeFr(e.start)}`)
      .join(', ');
    parts.push(
      `${evs.length} événement${evs.length > 1 ? 's' : ''} prévu${evs.length > 1 ? 's' : ''} : ${list}${evs.length > 3 ? ' et d’autres' : ''}`,
    );
  }
  if (open.length > 0) {
    const list = open
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ');
    parts.push(`${open.length} tâche${open.length > 1 ? 's' : ''} à faire : ${list}${open.length > 3 ? '…' : ''}`);
  }
  // « . Et . » : pauses nettes à l'oral entre les deux segments de la phrase
  return `${who}${label}, ${parts.join(' . Et . ')}.`;
}

/**
 * Exécute une commande vocale (ou tapée) et renvoie la réponse textuelle.
 * Parle la réponse si le réglage Voix est activé. Ne lève jamais d'erreur bloquante.
 */
export async function handleVoiceCommand(raw: string): Promise<string> {
  const s = useStore.getState();
  const ui = useUiStore.getState();
  const norm = normalizeText(raw);
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  let reply: string;

  if (norm.startsWith('ajoute')) {
    const rest = raw.replace(/^\s*ajoute\s+/i, '');
    const parsed = parseInput(rest);
    if (parsed.time) {
      const start = parsed.time;
      const end = timeOf(Math.min(minutesOf(start) + 60, 24 * 60 - 1));
      const conflict = findConflict(s.events, { date: parsed.date, start, end });
      if (conflict?.exact) {
        reply = `Je n’ai pas pu ajouter « ${parsed.title} » : ce créneau est déjà pris par « ${conflict.other.title} ».`;
      } else {
        s.addEvent({ title: parsed.title, date: parsed.date, start, end, category: parsed.category, repeat: 'jamais' });
        const when =
          parsed.date === today
            ? "aujourd'hui"
            : parsed.date === tomorrow
              ? 'demain'
              : formatDayLong(parsed.date);
        reply = `Ajouté : ${parsed.title}, ${when} à ${formatTimeFr(start)}.`;
      }
    } else {
      s.addTask({
        title: parsed.title,
        date: parsed.date,
        time: null,
        category: parsed.category,
        priority: parsed.priority,
      });
      const when = parsed.date === today ? "aujourd'hui" : parsed.date === tomorrow ? 'demain' : formatDayLong(parsed.date);
      reply = `Ajouté à tes tâches : ${parsed.title}, pour ${when}.`;
    }
  } else if (norm.includes('cest fait') || norm.startsWith('fait ')) {
    const rest = raw.replace(/^\s*(c'est|c est|fait)\s+/i, '');
    const target = normalizeText(rest);
    const candidates = s.tasks.filter((t) => !t.done);
    const match =
      candidates.find((t) => target && normalizeText(t.title).includes(target)) ??
      candidates.find((t) => target && target.includes(normalizeText(t.title)));
    if (match) {
      s.toggleTask(match.id);
      if (s.settings.sounds) playBlip(880);
      reply = `Bravo ! « ${match.title} » est cochée.`;
    } else {
      reply = "Je n’ai pas trouvé de tâche correspondante à cocher.";
    }
  } else if (norm.includes('demain') && (norm.includes('prevu') || norm.includes('programme') || norm.includes('quoi'))) {
    reply = programSentence(tomorrow);
  } else if (
    norm.includes('aujourdhui') ||
    norm.includes('mon programme') ||
    norm.includes('programme du jour') ||
    norm.includes('agenda') ||
    norm.includes('que dois-je faire')
  ) {
    reply = programSentence(today);
  } else {
    reply =
      "Je n’ai pas compris. Essaie : « ajoute sport demain 14h », « mon programme », « quoi de prévu demain ? » ou « c’est fait sport ».";
  }

  ui.setLastReply(reply);
  if (s.settings.voice) {
    try {
      await speak(reply);
    } catch {
      // aucune erreur bloquante
    }
  }
  return reply;
}

export { programSentence };
