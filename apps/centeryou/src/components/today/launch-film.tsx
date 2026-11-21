'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Play, SkipForward, Sparkles } from 'lucide-react';

import { Button } from '../ui/button';

import { categoryColor, categoryLabel } from '../../lib/categories';

import { formatRangeFr, formatTimeFr, todayISO } from '../../lib/dates';

import { formatHoursFr } from '../../lib/stats';

import { buildFilmData, launchFilmVoiceWanted, shouldShowLaunchFilm, type FilmData } from '../../lib/launch-film';

import { useMotionEnabled } from '../../lib/use-motion';

import { useStore } from '../../lib/store';

import { speak, stopSpeaking } from '../../lib/voice';

import { shouldShowWelcome } from '../../lib/welcome';

import { cx } from '../../lib/utils';

/**
 * Film de lancement (Réalisateur, M-06) — SUBLIME la séquence d'accueil existante :
 * plein écran, fond nuit vivant (halos + particules), 5 scènes en fondu flouté,
 * compteurs animés, anneau de progression, scène « magie » (la phrase dictée devient
 * la carte d'événement), signature d'ondes. Données 100 % réelles (buildFilmData).
 *
 * - Jamais bloquant : « Passer » toujours visible + Échap + clic hors zone.
 * - Voix : narration = texte du brief du matin (buildBriefText, source unique partagée
 *   avec BriefCard — aucun recalcul, aucun surcoût de quota) ; speak() réutilise la
 *   logique existante (navigateur par défaut, premium si droit + quota, bascule sinon).
 *   Jamais de son sans interaction : première ouverture de session -> bouton
 *   « ▶ Lancer le film » qui débloque ; sinon lecture auto.
 * - Sous-titres permanents en bas (aria-live).
 * - prefers-reduced-motion / réglage « Animations » off -> version sobre statique
 *   avec sous-titres complets (les keyframes CSS sont tuées par les blocs globaux,
 *   et aucun timer de scène n'est posé).
 * - Double verrou de fréquence conservé : `welcomeSequence`/`welcomeShownDate`
 *   (historique, marquage « vu » intact) + `launchFilm`/`launchFilmShownDate` (nouveau).
 */

/** durées des 5 scènes (ms) — ~38 s au total */
const SCENE_DURATIONS = [7200, 8600, 8600, 7600, 6200];

/** clé sessionStorage : un geste utilisateur a déjà eu lieu dans cet onglet */
const GESTURE_KEY = 'centeryou-film-gesture-v1';

/** requestAnimationFrame avec repli setTimeout (jsdom sans pretendToBeVisual) */
function requestFrame(cb: (t: number) => void): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') return window.requestAnimationFrame(cb);
  return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
}

function cancelFrame(id: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(id);
  else window.clearTimeout(id as unknown as Parameters<typeof window.clearTimeout>[0]);
}

/** compteur animé (rAF, ease-out cubique) — valeur finale instantanée si motion off */
function useAnimatedNumber(target: number, active: boolean, duration = 1300): number {
  const motion = useMotionEnabled();
  const [val, setVal] = useState(() => (motion ? 0 : target));
  useEffect(() => {
    if (!active) return;
    if (!motion) {
      setVal(target);
      return;
    }
    let id = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestFrame(step);
    };
    id = requestFrame(step);
    return () => cancelFrame(id);
  }, [active, motion, target, duration]);
  return val;
}

/** monogramme d'ondes vocales de Centeryou (SVG, cercles qui respirent) */
function VoiceMonogram({ size = 104 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="overflow-visible">
      {[44, 34, 24, 14].map((r, i) => (
        <circle
          key={r}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgb(var(--c-voice))"
          strokeWidth="2.4"
          className="film-breathe"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
      <circle cx="50" cy="50" r="5.5" fill="rgb(var(--c-voice))" />
    </svg>
  );
}

/** particules discrètes (positions déterministes, calculées une seule fois) */
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61 + 13) % 100,
  size: 3 + (i % 3),
  delay: (i * 1.7) % 12,
  duration: 11 + (i % 5) * 2.3,
  tone: i % 4,
}));

/** fond nuit vivant : halos dérivants aux couleurs des tokens + particules */
function FilmBackground() {
  return (
    <div className="film-bg" aria-hidden>
      <span className="film-halo film-halo-a" />
      <span className="film-halo film-halo-b" />
      <span className="film-halo film-halo-c" />
      <span className="film-halo film-halo-d" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={cx(
            'film-particle',
            p.tone === 1 && 'film-particle-teal',
            p.tone === 2 && 'film-particle-amber',
            p.tone === 3 && 'film-particle-violet',
          )}
          style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
    </div>
  );
}

/** scène 1 — ouverture : monogramme + salutation selon l'heure réelle + date */
function SceneOpen({ film }: { film: FilmData }) {
  return (
    <>
      <VoiceMonogram />
      <h1 className="film-title text-4xl font-extrabold tracking-tight md:text-6xl">
        {film.greeting}
        {film.prenom ? `, ${film.prenom}` : ''}
      </h1>
      <p className="film-sub text-lg font-semibold capitalize md:text-xl">{film.dateFr}</p>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="film-card flex flex-col items-center gap-1 rounded-card px-2 py-4 md:py-5">
      <span className="film-title text-2xl font-extrabold tabular-nums md:text-4xl">{value}</span>
      <span className="film-faint px-1 text-center text-xs font-semibold uppercase tracking-wide md:text-xs">{label}</span>
    </div>
  );
}

/** scène 2 — ta journée : compteurs animés + prochaine étape à halo pulsant (ou phrase motivante) */
function SceneDay({ film }: { film: FilmData }) {
  const ev = useAnimatedNumber(film.eventCount, true);
  const tk = useAnimatedNumber(film.taskOpen, true);
  const minutes = useAnimatedNumber(film.plannedMinutes, true, 1500);
  return (
    <>
      <h2 className="film-title text-2xl font-extrabold md:text-4xl">Ta journée</h2>
      <div className="grid w-full max-w-lg grid-cols-3 gap-2.5 md:gap-4">
        <Stat value={String(ev)} label={film.eventCount > 1 ? 'événements' : 'événement'} />
        <Stat value={String(tk)} label={film.taskOpen > 1 ? 'tâches à faire' : 'tâche à faire'} />
        <Stat value={formatHoursFr(minutes)} label="planifié" />
      </div>
      {film.next ? (
        <div data-film-keep className="film-card film-halo-pulse flex w-full max-w-md items-center gap-3 rounded-tile p-4 text-left">
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(film.next.category) }} />
          <span className="min-w-0">
            <span className="film-faint block text-xs font-bold uppercase tracking-wide">Prochaine étape</span>
            <span className="film-title block truncate text-base font-bold md:text-lg">{film.next.title}</span>
            <span className="film-sub block text-xs font-semibold md:text-sm">
              {formatRangeFr(film.next.start, film.next.end)} · {categoryLabel(film.next.category)}
            </span>
          </span>
        </div>
      ) : (
        <p className="film-sub flex max-w-md items-center justify-center gap-2 text-base font-semibold md:text-lg">
          <Sparkles size={18} aria-hidden className="shrink-0 text-warning" />
          Journée libre — une idée pour bien la lancer : « {film.suggestion} ».
        </p>
      )}
    </>
  );
}

/** anneau SVG animé (part des tâches faites cette semaine) */
function AnimatedRing({ percent }: { percent: number }) {
  const motion = useMotionEnabled();
  const R = 64;
  const C = 2 * Math.PI * R;
  const ref = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!motion) {
      el.style.strokeDashoffset = String(C * (1 - percent / 100));
      return;
    }
    let id = 0;
    const t0 = performance.now();
    const dur = 1600;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.style.strokeDashoffset = String(C * (1 - (percent / 100) * e));
      if (p < 1) id = requestFrame(step);
    };
    id = requestFrame(step);
    return () => cancelFrame(id);
  }, [percent, motion, C]);
  return (
    <div className="relative" role="img" aria-label={`${percent} pour cent des tâches de la semaine sont faites`}>
      <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden>
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgb(250 250 252 / 0.16)" strokeWidth="10" />
        <circle
          ref={ref}
          cx="80"
          cy="80"
          r={R}
          fill="none"
          stroke="rgb(var(--c-voice))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
          transform="rotate(-90 80 80)"
        />
      </svg>
      <span className="film-title absolute inset-0 flex items-center justify-center text-2xl font-extrabold tabular-nums">{percent} %</span>
    </div>
  );
}

/** scène 3 — ta progression : anneau + série de jours organisés + encouragement */
function SceneProgress({ film }: { film: FilmData }) {
  const pct = film.weekPercent ?? 0;
  return (
    <>
      <h2 className="film-title text-2xl font-extrabold md:text-4xl">Ta progression</h2>
      <AnimatedRing percent={pct} />
      <div className="flex items-center gap-2" aria-label={`Série de ${film.streak} jour${film.streak > 1 ? 's' : ''} organisés d’affilée`}>
        {film.weekDays.map((d) => (
          <span
            key={d.iso}
            aria-hidden
            className={cx('h-2.5 w-2.5 rounded-full', d.done ? 'film-dot-on' : 'film-dot-off', d.today && 'ring-2 ring-primary')}
          />
        ))}
      </div>
      <p className="film-sub max-w-md text-base font-semibold md:text-lg">
        {film.streak > 0 && (
          <span className="block">
            Série de {film.streak} jour{film.streak > 1 ? 's' : ''} organisés d’affilée.
          </span>
        )}
        {film.encouragement}
      </p>
    </>
  );
}

/** scène 4 — la magie : la phrase s'écrit, se dissout, se transforme en carte d'événement */
function SceneMagic({ film }: { film: FilmData }) {
  const motion = useMotionEnabled();
  const [chars, setChars] = useState(motion ? 0 : film.magicPhrase.length);
  const [card, setCard] = useState(!motion);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (!motion) {
      setChars(film.magicPhrase.length);
      setCard(true);
      return;
    }
    let i = 0;
    const tick = () => {
      i += 1;
      setChars(i);
      if (i < film.magicPhrase.length) timers.current.push(window.setTimeout(tick, 60));
      else timers.current.push(window.setTimeout(() => setCard(true), 700));
    };
    timers.current.push(window.setTimeout(tick, 600));
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, [film.magicPhrase, motion]);
  const category = film.next?.category ?? 'perso';
  return (
    <>
      <h2 className="film-title text-2xl font-extrabold md:text-4xl">La magie</h2>
      {card ? (
        <div key="card" className="film-scene flex flex-col items-center gap-5">
          <div data-film-keep className="film-card film-halo-pulse flex w-full max-w-md items-center gap-3 rounded-tile p-4 text-left">
            <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(category) }} />
            <span className="min-w-0">
              <span className="film-faint block text-xs font-bold uppercase tracking-wide">Carte créée</span>
              <span className="film-title block truncate text-base font-bold md:text-lg">{film.magicTitle}</span>
              <span className="film-sub block text-xs font-semibold md:text-sm">
                {film.magicTimeLabel} · {categoryLabel(category)}
              </span>
            </span>
          </div>
          <p className="film-faint text-sm">Dis-la à voix haute, ou écris-la dans l’ajout rapide — elle devient un événement.</p>
        </div>
      ) : (
        <div className="film-card w-full max-w-md rounded-pill px-5 py-4 text-left">
          <p className="film-title truncate text-base font-semibold md:text-lg">
            {film.magicPhrase.slice(0, chars)}
            <span className="film-caret" aria-hidden />
          </p>
        </div>
      )}
    </>
  );
}

/** scène 5 — signature : les ondes se concentrent, « Bonne journée » */
function SceneSignature({ film }: { film: FilmData }) {
  return (
    <>
      <VoiceMonogram size={88} />
      <h2 className="film-title text-2xl font-extrabold md:text-4xl">Ton planning qui te parle.</h2>
      <p className="film-sub text-xl font-bold md:text-2xl">Bonne journée{film.prenom ? `, ${film.prenom}` : ''}.</p>
    </>
  );
}

function SceneView({ scene, film }: { scene: number; film: FilmData }) {
  return (
    <div key={scene} className="film-scene flex w-full flex-col items-center gap-6 md:gap-8">
      {scene === 0 && <SceneOpen film={film} />}
      {scene === 1 && <SceneDay film={film} />}
      {scene === 2 && <SceneProgress film={film} />}
      {scene === 3 && <SceneMagic film={film} />}
      {scene === 4 && <SceneSignature film={film} />}
    </div>
  );
}

/** version sobre statique (prefers-reduced-motion / animations off) : tout le contenu, sous-titres complets */
function StaticPanel({ film }: { film: FilmData }) {
  return (
    <div data-testid="film-static" data-film-keep className="film-card mx-auto w-full max-w-xl rounded-tile p-6 text-left md:p-8">
      <h1 className="film-title text-2xl font-extrabold md:text-4xl">
        {film.greeting}
        {film.prenom ? `, ${film.prenom}` : ''}
      </h1>
      <p className="film-sub mt-1 font-semibold capitalize">{film.dateFr}</p>
      <ul className="film-sub mt-4 flex flex-col gap-1.5 text-sm md:text-base">
        <li>
          Aujourd’hui : {film.eventCount} événement{film.eventCount > 1 ? 's' : ''}, {film.taskOpen} tâche{film.taskOpen > 1 ? 's' : ''} à faire,{' '}
          {film.plannedHoursLabel} planifié{film.plannedMinutes > 60 ? 'es' : ''}.
        </li>
        <li>
          {film.next
            ? `Prochaine étape : ${film.next.title} à ${formatTimeFr(film.next.start)}.`
            : `Journée libre — suggestion du jour : « ${film.suggestion} ».`}
        </li>
        <li>
          {film.weekPercent === null
            ? 'Ta première semaine commence aujourd’hui.'
            : `${film.weekPercent} % des tâches de la semaine sont faites (${film.streak} jour${film.streak > 1 ? 's' : ''} organisés d’affilée).`}
        </li>
      </ul>
      <p className="film-faint mt-4 text-sm">« {film.magicPhrase} » — la phrase dictée devient une carte d’événement.</p>
      <p className="film-title mt-4 text-base font-bold md:text-lg">
        Ton planning qui te parle. Bonne journée{film.prenom ? `, ${film.prenom}` : ''}.
      </p>
    </div>
  );
}

export function LaunchFilm() {
  const hydrated = useStore((s) => s.hydrated);
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);
  const motion = useMotionEnabled();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [scene, setScene] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const timers = useRef<number[]>([]);
  const startedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const today = todayISO();
  const film = useMemo(() => buildFilmData(events, tasks, settings.prenom, today), [events, tasks, settings.prenom, today]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // décide une seule fois au chargement si le film joue (double verrou : historique + nouveau réglage)
  useEffect(() => {
    if (!hydrated) return;
    const s = useStore.getState();
    if (!shouldShowWelcome(s.settings.welcomeSequence, s.settings.welcomeShownDate, today)) return;
    if (!shouldShowLaunchFilm(s.settings.launchFilm, s.settings.launchFilmShownDate, today)) return;
    // marquage « vu » conservé : les deux tampons de date sont posés en mode « daily »
    if ((s.settings.welcomeSequence ?? 'daily') === 'daily') s.markWelcomeShown();
    if ((s.settings.launchFilm ?? 'daily') === 'daily') s.markLaunchFilmShown();
    let gesture = false;
    try {
      gesture = window.sessionStorage.getItem(GESTURE_KEY) === '1';
    } catch {
      gesture = false;
    }
    // voix demandée mais aucun geste dans cet onglet -> bouton « Lancer le film » (politique navigateur)
    setNeedsGesture(!gesture && launchFilmVoiceWanted(s.settings));
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const close = useCallback(() => {
    clearTimers();
    stopSpeaking();
    setSpeaking(false);
    setStarted(false);
    startedRef.current = false;
    setScene(0);
    setOpen(false);
  }, [clearTimers]);

  // narration = texte du brief du matin (source unique) — speak() gère premium/quota/bascule comme ailleurs
  const narrate = useCallback(async () => {
    const s = useStore.getState();
    if (!launchFilmVoiceWanted(s.settings)) return;
    setSpeaking(true);
    try {
      await speak(buildFilmData(s.events, s.tasks, s.settings.prenom, todayISO()).briefText);
    } catch {
      // jamais bloquant
    }
    setSpeaking(false);
  }, []);

  const scheduleScenes = useCallback(() => {
    clearTimers();
    let acc = 900;
    for (let i = 1; i < SCENE_DURATIONS.length; i++) {
      acc += SCENE_DURATIONS[i - 1];
      timers.current.push(window.setTimeout(() => setScene(i), acc));
    }
    acc += SCENE_DURATIONS[SCENE_DURATIONS.length - 1];
    timers.current.push(window.setTimeout(() => close(), acc + 900));
  }, [clearTimers, close]);

  const start = useCallback(
    (withVoice: boolean) => {
      try {
        window.sessionStorage.setItem(GESTURE_KEY, '1');
      } catch {
        // stockage indisponible : aucun impact
      }
      setNeedsGesture(false);
      setStarted(true);
      startedRef.current = true;
      if (withVoice) void narrate();
      if (motion) scheduleScenes();
    },
    [motion, narrate, scheduleScenes],
  );

  // lecture auto si un geste a déjà eu lieu dans cet onglet (et voix demandée) ; sinon on attend le bouton
  useEffect(() => {
    if (!open || startedRef.current || needsGesture) return;
    start(launchFilmVoiceWanted(useStore.getState().settings));
  }, [open, needsGesture, start]);

  // tout geste dans l'onglet débloque le son pour la prochaine fois
  useEffect(() => {
    if (!open) return;
    const mark = () => {
      try {
        window.sessionStorage.setItem(GESTURE_KEY, '1');
      } catch {
        // ignore
      }
    };
    window.addEventListener('pointerdown', mark, { capture: true });
    window.addEventListener('keydown', mark, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', mark, true);
      window.removeEventListener('keydown', mark, true);
    };
  }, [open]);

  // focus initial + piège de focus + Échap fiable (même pattern que ui/dialog.tsx)
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const panel = dialogRef.current;
    if (panel) {
      const target = panel.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      target?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, close]);

  if (!open) return null;

  const caption = motion ? film.captions[Math.min(scene, film.captions.length - 1)] : film.briefText;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Film de lancement — le résumé de ta journée"
      // Sourire (M-10) : .film-root redonne à l'intérieur du film les teintes vives
      // warning/danger (définies dans globals.css) — le film se joue sur la nuit #1A1B2E
      className="film-root animate-fade-in fixed inset-0 z-dialog"
      onClick={(e) => {
        // clic hors zone (fond nuit) -> on passe le film
        if (!(e.target as HTMLElement).closest('[data-film-keep]')) close();
      }}
    >
      <FilmBackground />

      <div className="absolute inset-x-0 top-0 z-20 flex justify-end p-4" data-film-keep>
        <Button variant="secondary" size="lg" onClick={close} className="border-2 font-bold shadow-card" aria-label="Passer le film de lancement">
          <SkipForward size={16} aria-hidden /> Passer
        </Button>
      </div>

      <div className="relative z-10 flex h-full items-center justify-center px-5 pb-24 pt-16">
        <div className="flex w-full max-w-2xl justify-center" data-film-keep>
          {needsGesture && !started ? (
            <div className="film-scene flex w-full flex-col items-center gap-6 text-center">
              <VoiceMonogram />
              <h1 className="film-title text-2xl font-extrabold md:text-4xl">
                {film.greeting}
                {film.prenom ? `, ${film.prenom}` : ''}
              </h1>
              <p className="film-sub font-semibold capitalize">{film.dateFr}</p>
              <Button
                size="lg"
                onClick={() => start(true)}
                aria-label="Lancer le film et écouter le résumé de la journée"
                className="mt-2 text-base font-bold"
              >
                <Play size={18} aria-hidden /> Lancer le film
              </Button>
              <p className="film-faint max-w-sm text-sm">Le son démarre avec ton accord — rien ne se lance jamais tout seul.</p>
            </div>
          ) : motion ? (
            <SceneView scene={scene} film={film} />
          ) : (
            <StaticPanel film={film} />
          )}
        </div>
      </div>

      {/* sous-titres permanents (lisibilité + accessibilité) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-5" data-film-keep>
        <p aria-live="polite" className="film-caption mx-auto w-fit max-w-2xl rounded-pill px-5 py-2.5 text-center text-sm font-semibold md:text-base">
          {caption}
          {speaking && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-voice align-middle" aria-label="lecture vocale en cours" />}
        </p>
      </div>
    </div>
  );
}
