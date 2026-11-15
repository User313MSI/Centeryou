'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChartLine, Hand, ListChecks, Play, SkipForward, Sparkles, Square } from 'lucide-react';
import { Button } from '../ui/button';
import { Waves } from '../brand/waves';
import { categoryColor } from '../../lib/categories';
import {
  addDaysISO,
  capitalize,
  formatDayLong,
  formatDayNumber,
  formatRangeFr,
  formatTimeFr,
  formatWeekdayShort,
  greetingFor,
  isToday,
  minutesOf,
  nowMinutes,
  startOfWeekISO,
  todayISO,
} from '../../lib/dates';
import { calendarOnDate, type CalendarInstance } from '../../lib/events';
import { useStore } from '../../lib/store';
import { speak, stopSpeaking } from '../../lib/voice';
import { cx } from '../../lib/utils';

/**
 * Séquence d'accueil animée (page Aujourd'hui) : plein écran temporaire qui résume
 * la journée. Les éléments apparaissent en douceur l'un après l'autre (200–300 ms).
 * Le son ne démarre JAMAIS sans clic : l'animation seule au chargement, la voix
 * uniquement via « ▶ Écouter le résumé » (ElevenLabs si clé présente, sinon Web Speech
 * API) — pendant la lecture, les éléments s'illuminent au fil du texte et le motif
 * d'ondes concentriques accompagne la voix. « Passer » ferme immédiatement.
 * Fréquence réglable dans Réglages : à chaque ouverture / une fois par jour (défaut) /
 * désactivée. prefers-reduced-motion : tout est instantané (globals.css).
 */
export function WelcomeSequence() {
  const hydrated = useStore((s) => s.hydrated);
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const timers = useRef<number[]>([]);

  // décide une seule fois au chargement si la séquence s'affiche
  useEffect(() => {
    if (!hydrated) return;
    const s = useStore.getState();
    const mode = s.settings.welcomeSequence ?? 'daily';
    if (mode === 'off') return;
    if (mode === 'daily' && s.settings.welcomeShownDate === todayISO()) return;
    if (mode === 'daily') s.markWelcomeShown();
    setOpen(true);
  }, [hydrated]);

  const today = todayISO();
  const prenom = settings.prenom.trim();
  const greeting = `${greetingFor()}${prenom ? ` ${prenom}` : ''}`;
  const dateFr = capitalize(formatDayLong(today));
  const dayPct = Math.max(0, Math.min(100, Math.round((nowMinutes() / (24 * 60)) * 100)));

  const nextItems = useMemo<CalendarInstance[]>(() => {
    const now = nowMinutes();
    return calendarOnDate(events, tasks, today)
      .filter((i) => minutesOf(i.end) >= now)
      .slice(0, 3);
  }, [events, tasks, today]);

  const weekDays = useMemo(() => {
    const start = startOfWeekISO(today);
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysISO(start, i);
      return { iso, count: calendarOnDate(events, tasks, iso).length };
    });
  }, [events, tasks, today]);
  const weekTotal = weekDays.reduce((a, d) => a + d.count, 0);
  const todayCount = calendarOnDate(events, tasks, today).length;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  if (!open) return null;

  const close = () => {
    clearTimers();
    stopSpeaking();
    setSpeaking(false);
    setActiveStep(-1);
    setOpen(false);
  };

  const buildSegments = (): { step: number; text: string }[] => [
    { step: 0, text: `${greeting}. Nous sommes le ${dateFr}.` },
    { step: 1, text: `La journée est déjà avancée à ${dayPct} pour cent.` },
    {
      step: 2,
      text:
        nextItems.length > 0
          ? `Tes ${nextItems.length} prochains rendez-vous aujourd’hui : ${nextItems
              .map((n) => `${n.title} à ${formatTimeFr(n.start)}`)
              .join(' ; ')}.`
          : 'Rien de plus de prévu pour le reste de la journée.',
    },
    {
      step: 3,
      text: `Cette semaine, ${weekTotal} élément${weekTotal > 1 ? 's sont' : ' est'} planifié${weekTotal > 1 ? 's' : ''} sur sept jours, dont ${todayCount} aujourd’hui.`,
    },
  ];

  const scheduleHighlights = (segs: { step: number; text: string }[]) => {
    clearTimers();
    const totalChars = segs.reduce((a, s) => a + s.text.length, 0) || 1;
    // durée estimée de la lecture (~14 caractères/s) — l'illumination suit au fil de la lecture
    const estMs = Math.min(Math.max(totalChars * 72, 1600), 30000);
    let acc = 0;
    for (const seg of segs) {
      const startMs = (acc / totalChars) * estMs;
      acc += seg.text.length;
      timers.current.push(window.setTimeout(() => setActiveStep(seg.step), startMs));
    }
    timers.current.push(window.setTimeout(() => setActiveStep(-1), estMs + 150));
  };

  const listen = async () => {
    const segs = buildSegments();
    const text = segs.map((s) => s.text).join(' ');
    const voiceOn = useStore.getState().settings.voice;
    if (!voiceOn) return; // assistant vocal désactivé dans les Réglages : aucun son
    setSpeaking(true);
    scheduleHighlights(segs);
    try {
      await speak(text);
    } catch {
      // jamais bloquant
    }
    clearTimers();
    setSpeaking(false);
    setActiveStep(-1);
  };

  const stop = () => {
    clearTimers();
    stopSpeaking();
    setSpeaking(false);
    setActiveStep(-1);
  };

  const sectionClass = (step: number) =>
    cx(
      'animate-slide-up rounded-card p-3 transition-all duration-normal ease-out',
      activeStep === step && 'bg-voice/10 ring-2 ring-voice/60',
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Séquence d’accueil — résumé de ta journée"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      className="animate-fade-in fixed inset-0 z-dialog flex items-center justify-center bg-veil/45 p-4 backdrop-blur-sm"
    >
      <div className="animate-slide-up flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-tile bg-surface p-6 shadow-hover md:p-8">
        <section className={sectionClass(0)} style={{ animationDelay: '120ms' }}>
          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold text-ink md:text-3xl">
            {greeting} <Hand size={26} aria-hidden className="shrink-0 text-warning" />
          </h2>
          <p className="mt-1 text-sm font-semibold capitalize text-muted">{dateFr}</p>
        </section>

        <section className={sectionClass(1)} style={{ animationDelay: '360ms' }} aria-label="Progression du jour">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <ChartLine size={16} aria-hidden className="text-voice" /> Progression du jour
          </h3>
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-line/70">
              <div className="h-full rounded-pill bg-voice transition-all duration-normal ease-out" style={{ width: `${dayPct}%` }} />
            </div>
            <span className="text-sm font-bold text-voice">{dayPct} %</span>
          </div>
        </section>

        <section className={sectionClass(2)} style={{ animationDelay: '600ms' }} aria-label="Prochains rendez-vous">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <ListChecks size={16} aria-hidden className="text-primary" /> Prochains rendez-vous
          </h3>
          {nextItems.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              Rien de plus de prévu pour le reste de la journée. <Sparkles size={14} aria-hidden className="text-warning" />
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {nextItems.map((n) => (
                <li key={`${n.kind}-${n.id}`} className="flex items-center gap-2 text-sm text-ink">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(n.category) }} />
                  <span className={cx('truncate font-semibold', n.done && 'text-muted line-through')}>{n.title}</span>
                  <span className="ml-auto shrink-0 text-xs font-semibold text-muted">{formatRangeFr(n.start, n.end)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={sectionClass(3)} style={{ animationDelay: '840ms' }} aria-label="Aperçu de la semaine">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarDays size={16} aria-hidden className="text-primary" /> Aperçu de la semaine
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => (
              <div key={d.iso} className="flex flex-col items-center gap-0.5 py-1.5" aria-label={`${formatDayLong(d.iso)} : ${d.count} élément${d.count > 1 ? 's' : ''}`}>
                <span className="text-xs font-bold uppercase text-muted md:text-[10px]">{formatWeekdayShort(d.iso).slice(0, 3)}</span>
                <span
                  className={cx(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                    isToday(d.iso) ? 'bg-primary text-surface' : 'text-ink',
                  )}
                >
                  {formatDayNumber(d.iso)}
                </span>
                <span className={cx('text-xs font-semibold md:text-[10px]', d.count > 0 ? 'text-voice' : 'text-muted')}>
                  {d.count > 0 ? `${d.count} él.` : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="animate-slide-up mt-1 flex flex-wrap items-center justify-end gap-2.5" style={{ animationDelay: '1080ms' }}>
          {speaking && (
            <span className="mr-auto flex items-center gap-2 text-sm font-semibold text-voice">
              <Waves /> Lecture en cours…
            </span>
          )}
          {speaking ? (
            <Button variant="secondary" size="lg" onClick={stop} aria-label="Arrêter la lecture du résumé">
              <Square size={16} aria-hidden /> Stop
            </Button>
          ) : (
            <Button size="lg" onClick={listen} aria-label="Écouter le résumé de la journée">
              <Play size={16} aria-hidden /> ▶ Écouter le résumé
            </Button>
          )}
          <Button variant="secondary" size="lg" onClick={close} className="border-2 font-bold" aria-label="Passer la séquence d’accueil">
            <SkipForward size={16} aria-hidden /> Passer
          </Button>
        </div>
      </div>
    </div>
  );
}
