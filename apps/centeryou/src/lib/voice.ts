'use client';

import { FREE_PREMIUM_VOICE_LIMIT_PER_MONTH } from './plans';
import { useStore } from './store';
import { currentMonth, isPremiumActive, premiumVoiceRemaining } from './subscription';
import { useUiStore } from './ui-store';

/**
 * Service vocal unique de Centeryou.
 *
 * Deux moteurs :
 *  1. Premium (côté serveur) : la route API /api/voix appelle ElevenLabs avec la clé
 *     serveur, jamais exposée au navigateur. Côté client, réservée à l'offre Premium
 *     (illimitée) ou aux 3 essais gratuits/mois de l'offre Découverte ; le serveur
 *     applique en plus son quota de protection (300 caractères/jour) et exige un
 *     profil renseigné (prénom dans les Réglages).
 *  2. Défaut, GRATUIT : Web Speech API (speechSynthesis + webkitSpeechRecognition),
 *     voix française (fr-FR), débit 1.0, résultats intermédiaires. Utilisée par les
 *     anonymes et en bascule douce (quota atteint, clé absente ou erreur) — jamais
 *     d'erreur bloquante.
 */

const PREMIUM_ENDPOINT = '/api/voix';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isRecognitionAvailable(): boolean {
  return getRecognitionCtor() !== null;
}

let currentAudio: HTMLAudioElement | null = null;

function playAudioBuffer(buf: ArrayBuffer): Promise<void> {
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('lecture audio'));
    };
    audio.play().catch((err) => {
      cleanup();
      reject(err);
    });
  });
}

async function speakWithPremium(text: string): Promise<boolean> {
  const prenom = useStore.getState().settings.prenom.trim();
  if (!prenom) return false;
  try {
    const res = await fetch(PREMIUM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-centeryou-user': prenom },
      body: JSON.stringify({ text }),
    });
    if (res.status === 429) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      useUiStore.getState().pushToast({
        message:
          data?.message ??
          "Quota de voix premium atteint pour aujourd'hui — la voix de ton navigateur prend le relais.",
        duration: 7000,
      });
      return false;
    }
    if (!res.ok) return false;
    await playAudioBuffer(await res.arrayBuffer());
    return true;
  } catch {
    return false;
  }
}

function speakWithWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!isSynthesisAvailable()) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const frVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('fr')) ??
      voices.find((v) => v.lang.toLowerCase().includes('fr'));
    if (frVoice) utterance.voice = frVoice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
    // garde-fou si onend ne se déclenche jamais
    window.setTimeout(resolve, 20000);
  });
}

/** enregistre l'essai gratuit utilisé et propose Premium quand le quota mensuel est épuisé */
function recordVoiceQuotaUsage(premium: boolean): void {
  if (premium) return;
  const used = useStore.getState().recordPremiumVoice();
  if (used >= FREE_PREMIUM_VOICE_LIMIT_PER_MONTH) {
    useUiStore.getState().pushToast({
      message: `Voix premium : tes ${FREE_PREMIUM_VOICE_LIMIT_PER_MONTH} essais gratuits du mois sont utilisés. Passe Premium pour une voix premium illimitée.`,
      actionLabel: 'Passer Premium',
      onAction: () => {
        window.location.href = '/reglages#abonnement';
      },
      duration: 9000,
    });
  }
}

export async function speak(text: string): Promise<void> {
  if (!text.trim()) return;
  const state = useStore.getState();
  const premium = isPremiumActive(state.subscription);
  const remaining = premiumVoiceRemaining(state.voiceQuota, currentMonth());
  if (premium || remaining > 0) {
    if (await speakWithPremium(text)) {
      recordVoiceQuotaUsage(premium);
      return;
    }
  }
  await speakWithWebSpeech(text);
}

export function stopSpeaking(): void {
  if (isSynthesisAvailable()) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export interface ListeningHandle {
  stop: () => void;
}

/**
 * Démarre la reconnaissance vocale (webkitSpeechRecognition si disponible,
 * Chrome/Edge), lang fr-FR, résultats intermédiaires transmis en direct.
 * Retourne null si la reconnaissance n'est pas disponible.
 */
export function startListening(
  onResult: (text: string, isFinal: boolean) => void,
  onEnd?: () => void,
): ListeningHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor || typeof window === 'undefined') return null;
  let rec: SpeechRecognitionLike;
  try {
    rec = new Ctor();
  } catch {
    return null;
  }
  rec.lang = 'fr-FR';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const ev = e as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
    const last = ev.results[ev.results.length - 1];
    const isFinal = (last as unknown as { isFinal: boolean }).isFinal;
    onResult(last[0].transcript, Boolean(isFinal));
  };
  rec.onerror = () => onEnd?.();
  rec.onend = () => onEnd?.();
  try {
    rec.start();
  } catch {
    onEnd?.();
    return null;
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    },
  };
}

/** petit bip UI (réglage « sons »), via Web Audio, sans dépendance */
export function playBlip(frequency = 660): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // son indisponible : aucun impact
  }
}
