'use client';

import { addDaysISO, formatDayLong, formatTimeFr, minutesOf, timeOf, todayISO } from './dates';

import { eventsOnDate, findConflict } from './events';

import { cleanTitle, dateWarningMessage, parseInputDetailed, type ParsedInputDetails } from './parser';

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
  return `${who}${label}, ${parts.join('. Et . ')}.`;
}

function whenLabel(date: string, today: string, tomorrow: string): string {
  return date === today ? "aujourd'hui" : date === tomorrow ? 'demain' : formatDayLong(date);
}

/**
 * Crée la tâche ou l’événement à partir d’un résultat de parseur.
 * Règle unique, partout pareil : une heure = événement d’1 h (avec refus poli
 * si le créneau est déjà pris exactement), sinon = tâche.
 */
function createFromParsed(parsed: ParsedInputDetails, today: string, tomorrow: string): string {
  const s = useStore.getState();
  // M-22 : la commande vocale passe par la MÊME usine à titres que la saisie rapide
  // clavier (cleanTitle, unique, dans parser.ts) — le message affiche le titre propre.
  const title = cleanTitle(parsed.title);
  // M-31 : garde-fou — si un fragment ressemblait à une date sans être reconnu,
  // l’avertissement remonte dans la réponse (écrite ET parlée), jamais de mauvais jour silencieux.
  const warn = dateWarningMessage(parsed.dateWarning, parsed.hasDate);
  const suffix = warn ? ` ⚠️ ${warn}` : '';
  if (parsed.time) {
    const start = parsed.time;
    const end = timeOf(Math.min(minutesOf(start) + 60, 24 * 60 - 1));
    const conflict = findConflict(s.events, { date: parsed.date, start, end });
    if (conflict?.exact) {
      return `Je n’ai pas pu ajouter « ${title} » : ce créneau est déjà pris par « ${conflict.other.title} ».${suffix}`;
    }
    s.addEvent({ title, date: parsed.date, start, end, category: parsed.category, repeat: 'jamais' });
    return `Ajouté : ${title}, ${whenLabel(parsed.date, today, tomorrow)} à ${formatTimeFr(start)}.${suffix}`;
  }
  s.addTask({
    title,
    date: parsed.date,
    time: null,
    category: parsed.category,
    priority: parsed.priority,
  });
  return `Ajouté à tes tâches : ${title}, pour ${whenLabel(parsed.date, today, tomorrow)}.${suffix}`;
}

/** M-19 — aide en cas d’échec réel : invite à parler naturellement + liste figée de formules. */
const HELP_REPLY =
  "Je n’ai pas compris. Dis ce que tu veux dans les mots que tu veux : « stream Red Dead 2 demain soir 21h » ou « rdv dentiste vendredi 10h30 » seront compris. Formules sûres : « ajoute sport demain 14h », « mon programme », « quoi de prévu demain ? », « c’est fait sport ».";

/**
 * Exécute une commande vocale (ou tapée) et renvoie la réponse textuelle.
 * Parle la réponse si le réglage Voix est activé. Ne lève jamais d'erreur bloquante.
 *
 * M-19 : avant de répondre « Je n’ai pas compris », on tente TOUJOURS le parseur
 * sur la phrase entière — toute date ou heure reconnue crée la tâche/l’événement.
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
    // M-31 : parseInputDetailed pour porter aussi l’avertissement « date non comprise »
    reply = createFromParsed(parseInputDetailed(rest, today), today, tomorrow);
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
    // M-22 : une phrase qui contient une heure est une création, pas une demande de
    // programme (« euh bah non justement c'est plutôt aujourd'hui réunion à 14h »).
    const detailed = parseInputDetailed(raw, today);
    if (detailed.hasTime) {
      reply = createFromParsed(detailed, today, tomorrow);
    } else {
      reply = programSentence(today);
    }
  } else {
    // M-19 : repli naturel — toute phrase contenant une date ou une heure est comprise
    const detailed = parseInputDetailed(raw, today);
    if (detailed.hasDate || detailed.hasTime) {
      reply = createFromParsed(detailed, today, tomorrow);
    } else {
      reply = HELP_REPLY;
    }
  }

  ui.setLastReply(reply);
  if (s.settings.voice) {
    try {
      await speak(reply);
    } catch {
      // aucune erreur bloquante
    }
  } else {
    // voix désactivée : la réponse reste visible en texte (toast), jamais muette
    ui.pushToast({ message: reply, duration: 6000 });
  }
  return reply;
}

export { programSentence };
