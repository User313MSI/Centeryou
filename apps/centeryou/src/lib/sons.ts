'use client';

/**
 * Diapason (M-16) — le moteur sonore de Centeryou, 100 % synthétisé en direct par le
 * moteur audio du navigateur (Web Audio API : oscillateurs + enveloppes de gain).
 * ZÉRO fichier binaire dans le dépôt, ZÉRO dépendance.
 *
 * Bibliothèque (feutrée, « petite boîte à musique bienveillante », jamais « machine à sous ») :
 * - « ding »     : coche de tâche — 2 notes douces montantes (mi5 → si5) ;
 * - « pop »      : création d'événement — note veloutée (fa5, triangle + harmonique discrète) ;
 * - « carillon » : notification de rappel — 3 notes discrètes descendantes (la5 → mi5 → do5) ;
 * - « record »   : record battu (/stats) — petit motif 3 notes (do5 → mi5 → sol5) ;
 * - nappe du film : 2-3 accords lents en boucle (la m → fa → sol → do), attaque/relâchement très doux.
 *
 * Règles absolues :
 * - JAMAIS de son sans geste utilisateur préalable dans la session (politique des navigateurs :
 *   `audioDebloque()` ne devient vrai qu'après un pointerdown / keydown / touchstart dans l'onglet,
 *   mémorisé en sessionStorage — même logique que le déverrouillage du film de lancement) ;
 * - jamais plus de MAX_SONS_SIMULTANES sons à la fois (la nappe compte pour un créneau) ;
 * - tout est piloté par les réglages persistés : `sounds` (on/off), `soundVolume` (0–1, défaut BAS),
 *   `filmPad` (nappe du film, OFF par défaut — elle ne s'impose jamais) ;
 * - sans Web Audio (SSR, jsdom, vieux navigateur) : no-op silencieux, aucun crash.
 */

import type { Settings } from '../types';

import { useStore } from './store';

/** volume par défaut des effets sonores : BAS */
export const VOLUME_DEFAUT_SONS = 0.35;

/** jamais plus de 2 sons à la fois */
export const MAX_SONS_SIMULTANES = 2;

/** clé sessionStorage : un geste utilisateur a déjà eu lieu dans cet onglet */
export const CLE_GESTE_SONS = 'centeryou-sons-gesture-v1';

/** noms des sons de la bibliothèque */
export type NomSon = 'ding' | 'pop' | 'carillon' | 'record';

/** une note du plan : fréquence (Hz), décalage de début (s), durée (s), forme d'onde, gain relatif */
export interface NoteSon {
  f: number;
  t: number;
  d: number;
  onde?: 'sine' | 'triangle';
  g?: number;
}

/**
 * Plans des sons (fréquences agréables, intervalles justes — quintes et tierces) :
 * chaque son dure moins de 1,6 s, rien ne « crie ».
 */
export const PLANS: Record<NomSon, NoteSon[]> = {
  // coche de tâche : 2 notes douces montantes (mi5 → si5, quinte juste)
  ding: [
    { f: 659.25, t: 0, d: 0.55, onde: 'triangle', g: 1 },
    { f: 987.77, t: 0.14, d: 0.7, onde: 'triangle', g: 0.8 },
  ],
  // création d'événement : fa5 velouté + harmonique do6 très discrète
  pop: [
    { f: 698.46, t: 0, d: 0.3, onde: 'triangle', g: 1 },
    { f: 1046.5, t: 0.02, d: 0.22, onde: 'sine', g: 0.22 },
  ],
  // notification de rappel : carillon discret (la5 → mi5 → do5)
  carillon: [
    { f: 880, t: 0, d: 0.9, onde: 'sine', g: 1 },
    { f: 659.25, t: 0.22, d: 0.9, onde: 'sine', g: 0.8 },
    { f: 523.25, t: 0.44, d: 1.1, onde: 'sine', g: 0.7 },
  ],
  // record battu : petit motif montant (do5 → mi5 → sol5)
  record: [
    { f: 523.25, t: 0, d: 0.4, onde: 'triangle', g: 0.9 },
    { f: 659.25, t: 0.1, d: 0.4, onde: 'triangle', g: 0.9 },
    { f: 784, t: 0.2, d: 0.6, onde: 'triangle', g: 1 },
  ],
};

/** accords de la nappe du film (la mineur → fa majeur → sol majeur → do majeur) */
export const ACCORDS_NAPPE: number[][] = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66],
  [261.63, 329.63, 392.0],
];

/** un accord toutes les 8 s, attaque lente (2,8 s) et relâchement qui chevauche l'accord suivant */
export const DUREE_ACCORDE_S = 8;
export const ATTAQUE_NAPPE_S = 2.8;

/* ------------------------------------------------------------------ *
 *  Interfaces structurelles minimales (le vrai AudioContext s'y conforme,
 *  les tests y injectent un faux contexte).
 * ------------------------------------------------------------------ */

export interface OscLike {
  type: string;
  frequency: { value: number };
  connect: (n: unknown) => void;
  start: (t?: number) => void;
  stop: (t?: number) => void;
  onended: (() => void) | null;
}

export interface GainLike {
  gain: {
    value: number;
    setValueAtTime: (v: number, t: number) => void;
    linearRampToValueAtTime: (v: number, t: number) => void;
    exponentialRampToValueAtTime: (v: number, t: number) => void;
    cancelScheduledValues?: (t: number) => void;
  };
  connect: (n: unknown) => void;
}

export interface ContexteLike {
  currentTime: number;
  state: string;
  destination: unknown;
  resume?: () => unknown;
  createOscillator: () => OscLike;
  createGain: () => GainLike;
}

/* ------------------------------------------------------------------ *
 *  Réglages (helpers purs, testables en node)
 * ------------------------------------------------------------------ */

/** effets sonores activés ? (défaut : oui) */
export function sonsActifsFrom(s: Pick<Settings, 'sounds'> | undefined | null): boolean {
  return s == null ? true : s.sounds === true;
}

/** volume 0–1 (défaut bas garanti, borné) */
export function volumeFrom(s: Pick<Settings, 'soundVolume'> | undefined | null): number {
  const v = s?.soundVolume;
  if (typeof v !== 'number' || !Number.isFinite(v)) return VOLUME_DEFAUT_SONS;
  return Math.min(1, Math.max(0, v));
}

/** la nappe du film est-elle voulue ? (OFF par défaut — elle ne s'impose jamais) */
export function nappeVoulue(s: Pick<Settings, 'sounds' | 'filmPad'> | undefined | null): boolean {
  return sonsActifsFrom(s) && (s?.filmPad ?? false) === true;
}

/* ------------------------------------------------------------------ *
 *  Déverrouillage audio (politique navigateur : geste obligatoire)
 * ------------------------------------------------------------------ */

let contexte: ContexteLike | null = null;
let debloque = false;
let nbActifs = 0;
let nappeEnCours: (() => void) | null = null;
let ecouteursPoses = false;

function lireGesteSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(CLE_GESTE_SONS) === '1';
  } catch {
    return false;
  }
}

/** marque qu'un geste utilisateur a eu lieu dans cet onglet : débloque l'audio pour la session */
export function marquerGesteAudio(): void {
  debloque = true;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(CLE_GESTE_SONS, '1');
    } catch {
      // stockage indisponible : le flag mémoire suffit pour la session
    }
  }
  if (contexte && contexte.state === 'suspended' && typeof contexte.resume === 'function') {
    try {
      void contexte.resume();
    } catch {
      // ignore
    }
  }
}

/** un geste utilisateur a-t-il déjà eu lieu dans cet onglet ? JAMAIS de son sinon. */
export function audioDebloque(): boolean {
  if (debloque) return true;
  debloque = lireGesteSession();
  return debloque;
}

/** pose une seule fois les écouteurs de geste (capture) qui débloquent l'audio */
export function assurerEcouteursGeste(): void {
  if (typeof window === 'undefined' || ecouteursPoses) return;
  ecouteursPoses = true;
  window.addEventListener('pointerdown', marquerGesteAudio, { capture: true });
  window.addEventListener('keydown', marquerGesteAudio, { capture: true });
  window.addEventListener('touchstart', marquerGesteAudio, { capture: true });
}

// à l'import (navigateur uniquement) : état initial + écouteurs de déverrouillage
if (typeof window !== 'undefined') {
  debloque = lireGesteSession();
  assurerEcouteursGeste();
}

/* ------------------------------------------------------------------ *
 *  Contexte audio partagé (singleton, créé lazily)
 * ------------------------------------------------------------------ */

function nouveauContexte(): ContexteLike | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    return new Ctx() as unknown as ContexteLike;
  } catch {
    return null;
  }
}

/** contexte audio partagé ; tente un resume() si le navigateur l'a suspendu */
export function getContexte(): ContexteLike | null {
  if (!contexte) contexte = nouveauContexte();
  if (contexte && contexte.state === 'suspended' && typeof contexte.resume === 'function') {
    try {
      void contexte.resume();
    } catch {
      // ignore
    }
  }
  return contexte;
}

/* ------------------------------------------------------------------ *
 *  Lecture d'un plan de notes (orchestration Web Audio pure)
 * ------------------------------------------------------------------ */

/** durée totale d'un plan (s) */
export function dureePlan(notes: NoteSon[]): number {
  let fin = 0;
  for (const n of notes) fin = Math.max(fin, n.t + n.d);
  return fin;
}

/**
 * Joue un plan de notes sur un contexte : chaque note = oscillateur + enveloppe
 * (attaque ~30 ms, relâchement exponentiel doux) sous un gain maître = volume.
 * Renvoie la durée totale et le dernier oscillateur (pour brancher onended).
 */
export function jouerPlan(
  ctx: ContexteLike,
  notes: NoteSon[],
  volume: number,
  depart?: number,
): { duree: number; dernier: OscLike | null } {
  const t0 = depart ?? ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);
  let dernier: OscLike | null = null;
  let fin = 0;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    osc.type = n.onde ?? 'sine';
    osc.frequency.value = n.f;
    const g = ctx.createGain();
    const peak = 0.22 * (n.g ?? 1); // crête par note : doux, jamais criard
    const a = t0 + n.t;
    const rel = a + n.d;
    g.gain.setValueAtTime(0.0001, a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), a + Math.min(0.03, n.d * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, rel + 0.25);
    osc.connect(g);
    g.connect(master);
    osc.start(a);
    osc.stop(rel + 0.3);
    dernier = osc;
    fin = Math.max(fin, n.t + n.d);
  }
  return { duree: fin, dernier };
}

/* ------------------------------------------------------------------ *
 *  Moteur : jouer un son (avec toutes les gardes)
 * ------------------------------------------------------------------ */

export interface SonsDeps {
  getSettings?: () => Pick<Settings, 'sounds' | 'soundVolume' | 'filmPad'> | undefined;
  getCtx?: () => ContexteLike | null;
  estDebloque?: () => boolean;
  getVolume?: () => number;
  maintenant?: () => number;
}

/**
 * Joue un son de la bibliothèque. Renvoie true seulement si un son a réellement été joué.
 * Gardes, dans l'ordre : réglage « sons » actif → geste utilisateur dans la session →
 * moins de MAX_SONS_SIMULTANES sons en cours → Web Audio disponible et running.
 */
export function jouerSon(nom: NomSon, deps: SonsDeps = {}): boolean {
  const s = deps.getSettings?.() ?? useStore.getState().settings;
  if (!sonsActifsFrom(s)) return false;
  if (!(deps.estDebloque?.() ?? audioDebloque())) return false;
  if (nbActifs >= MAX_SONS_SIMULTANES) return false;
  const ctx = deps.getCtx?.() ?? getContexte();
  if (!ctx) return false;
  if (ctx.state && ctx.state !== 'running') {
    try {
      void ctx.resume?.();
    } catch {
      // ignore
    }
    return false;
  }
  const volume = deps.getVolume?.() ?? volumeFrom(s);
  const { duree, dernier } = jouerPlan(ctx, PLANS[nom], volume, deps.maintenant?.() ?? ctx.currentTime);
  nbActifs += 1;
  const liberer = () => {
    nbActifs = Math.max(0, nbActifs - 1);
  };
  if (dernier) dernier.onended = liberer;
  // sécurité : le créneau est libéré même si onended ne se déclenche pas
  globalThis.setTimeout(liberer, duree * 1000 + 600);
  return true;
}

/** « ding » chaleureux — coche de tâche (2 notes douces) */
export function playDing(deps?: SonsDeps): boolean {
  return jouerSon('ding', deps);
}

/** « pop » velouté — création d'événement */
export function playPop(deps?: SonsDeps): boolean {
  return jouerSon('pop', deps);
}

/** carillon discret — notification de rappel */
export function playCarillon(deps?: SonsDeps): boolean {
  return jouerSon('carillon', deps);
}

/** petit motif — record battu (/stats) */
export function playRecord(deps?: SonsDeps): boolean {
  return jouerSon('record', deps);
}

/* ------------------------------------------------------------------ *
 *  Nappe ambiante du film (OFF par défaut, 2-3 accords lents)
 * ------------------------------------------------------------------ */

/**
 * Démarre la nappe du film : accords de ACCORDS_NAPPE en boucle (un toutes les DUREE_ACCORDE_S s),
 * attaque lente et relâchement chevauchant, volume = moitié du réglage (très douce).
 * Ne démarre QUE si `filmPad` est activé (jamais par défaut), si les sons sont actifs,
 * si un geste a débloqué l'audio, et si un créneau est libre (la nappe en occupe un).
 * Renvoie la fonction d'arrêt, ou null si la nappe ne doit pas jouer.
 */
export function startNappe(deps: SonsDeps = {}): (() => void) | null {
  const s = deps.getSettings?.() ?? useStore.getState().settings;
  if (!nappeVoulue(s)) return null;
  if (!(deps.estDebloque?.() ?? audioDebloque())) return null;
  if (nbActifs >= MAX_SONS_SIMULTANES) return null;
  const ctx = deps.getCtx?.() ?? getContexte();
  if (!ctx || (ctx.state && ctx.state !== 'running')) return null;

  const volume = (deps.getVolume?.() ?? volumeFrom(s)) * 0.5;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.5), ctx.currentTime + ATTAQUE_NAPPE_S);
  master.connect(ctx.destination);

  const oscs: OscLike[] = [];
  let indexAccord = 0;
  let arrete = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const jouerAccord = () => {
    if (arrete) return;
    const accord = ACCORDS_NAPPE[indexAccord % ACCORDS_NAPPE.length];
    indexAccord += 1;
    const t0 = ctx.currentTime + 0.05;
    for (const f of accord) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const peak = volume * 0.34;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + ATTAQUE_NAPPE_S);
      g.gain.setValueAtTime(Math.max(0.0002, peak), t0 + DUREE_ACCORDE_S - 2.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + DUREE_ACCORDE_S + 1.5);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + DUREE_ACCORDE_S + 1.8);
      oscs.push(osc);
    }
    timer = globalThis.setTimeout(jouerAccord, DUREE_ACCORDE_S * 1000);
  };
  timer = globalThis.setTimeout(jouerAccord, 60);

  nbActifs += 1; // la nappe occupe un créneau tant qu'elle joue

  const stop = () => {
    if (arrete) return;
    arrete = true;
    if (timer !== null) globalThis.clearTimeout(timer);
    try {
      master.gain.cancelScheduledValues?.(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    } catch {
      // ignore
    }
    for (const o of oscs) {
      try {
        o.stop(ctx.currentTime + 0.9);
      } catch {
        // ignore
      }
    }
    globalThis.setTimeout(() => {
      nbActifs = Math.max(0, nbActifs - 1);
      if (nappeEnCours === stop) nappeEnCours = null;
    }, 1000);
  };

  nappeEnCours = stop;
  return stop;
}

/** arrête la nappe du film si elle joue */
export function stopNappe(): void {
  if (nappeEnCours) {
    const stop = nappeEnCours;
    nappeEnCours = null;
    stop();
  }
}

/** la nappe du film joue-t-elle en ce moment ? */
export function nappeActive(): boolean {
  return nappeEnCours !== null;
}

/** réinitialisation des états internes (tests uniquement) */
export function reinitialiserSons(): void {
  debloque = false;
  nbActifs = 0;
  contexte = null;
  nappeEnCours = null;
  ecouteursPoses = false;
}
