'use client';

import { useEffect, useState } from 'react';
import { Square, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardBody } from '../ui/card';
import { eventsOnDate } from '../../lib/events';
import { formatTimeFr, greetingFor, todayISO } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { speak, stopSpeaking } from '../../lib/voice';

/**
 * Brief du matin : proposé UNE seule fois par jour (à la première ouverture),
 * jamais lancé automatiquement — le son ne démarre que sur clic.
 */
export function BriefCard() {
  const [offered, setOffered] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [briefText, setBriefText] = useState('');

  useEffect(() => {
    const s = useStore.getState();
    if (s.settings.briefShownDate !== todayISO()) {
      setOffered(true);
      s.markBriefShown();
    }
  }, []);

  if (!offered) return null;

  const listen = async () => {
    const s = useStore.getState();
    const today = todayISO();
    const evs = eventsOnDate(s.events, today);
    const dayTasks = s.tasks.filter((t) => t.date === today);
    const done = dayTasks.filter((t) => t.done).length;
    const prenom = s.settings.prenom.trim();
    const phrases = [
      `${greetingFor()}${prenom ? ` ${prenom}` : ''}.`,
      evs.length > 0
        ? `Aujourd’hui, tu as ${evs.length} événement${evs.length > 1 ? 's' : ''}${
            evs[0] ? ` — le premier à ${formatTimeFr(evs[0].start)} : ${evs[0].event.title}` : ''
          }.`
        : "Côté agenda, ta journée est libre aujourd’hui.",
      dayTasks.length > 0
        ? `${done} tâche${done > 1 ? 's' : ''} sur ${dayTasks.length} déjà accomplie${done > 1 ? 's' : ''}.`
        : "Aucune tâche n’est prévue aujourd’hui.",
    ];
    const text = phrases.join(' ');
    setBriefText(text);
    if (s.settings.voice) {
      setSpeaking(true);
      try {
        await speak(text);
      } catch {
        // jamais bloquant
      }
      setSpeaking(false);
    }
  };

  const stop = () => {
    stopSpeaking();
    setSpeaking(false);
  };

  return (
    <Card className="border-voice/40 bg-voice/5">
      <CardBody className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Sun size={18} aria-hidden className="text-warning" /> Ton brief du matin
          </h2>
          <div className="flex items-center gap-2">
            {speaking && (
              <Button variant="secondary" size="sm" onClick={stop} aria-label="Arrêter la lecture du brief">
                <Square size={14} aria-hidden /> Arrêter
              </Button>
            )}
            <Button size="sm" onClick={listen} disabled={speaking} aria-label="Écouter mon brief du jour">
              <Sun size={16} aria-hidden /> Écouter mon brief du jour
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted">
          Trois phrases pour savoir où tu en es ce matin. Le brief n’est proposé qu’une fois par jour et ne se lance
          jamais tout seul.
        </p>
        {briefText && !speaking && <p className="rounded-card bg-surface px-4 py-3 text-sm text-ink">{briefText}</p>}
      </CardBody>
    </Card>
  );
}
