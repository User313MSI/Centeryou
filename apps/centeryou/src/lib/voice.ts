'use client';

/**
 * Service vocal unique de Centeryou.
 *
 * Deux moteurs :
 *  1. Défaut, SANS CLÉ API : Web Speech API (speechSynthesis + webkitSpeechRecognition),
 *     voix française (fr-FR), débit 1.0, résultats intermédiaires.
 *  2. ElevenLabs, OPTIONNEL : uniquement si le serveur a une clé (NEXT_ELEVENLABS_API_KEY,
 *     exposé au client uniquement via le booléen NEXT_PUBLIC_ELEVENLABS_ENABLED).
 *     La clé transite exclusivement par la route serveur /api/tts, jamais dans le bundle client.
 *     En cas de clé absente ou d'échec réseau/API, bascule automatique sur le moteur
 *     par défaut — jamais d'erreur bloquante.
 */

const ELEVENLABS_ENABLED = process.env.NEXT_PUBLIC_ELEVENLABS_ENABLED === '1';

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

export function usesElevenLabs(): boolean {
  return ELEVENLABS_ENABLED;
}

let currentAudio: HTMLAudioElement | null = null;

async function speakWithElevenLabs(text: string): Promise<void> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
  await new Promise<void>((resolve, reject) => {
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

export async function speak(text: string): Promise<void> {
  if (!text.trim()) return;
  if (ELEVENLABS_ENABLED) {
    try {
      await speakWithElevenLabs(text);
      return;
    } catch {
      // bascule automatique sur le moteur par défaut
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
