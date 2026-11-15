'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { useUiStore } from '../../lib/ui-store';
import { handleVoiceCommand } from '../../lib/voice-commands';
import { isRecognitionAvailable, startListening, stopSpeaking, type ListeningHandle } from '../../lib/voice';
import { cx } from '../../lib/utils';
import { Waves } from '../brand/waves';

export function VoiceFab() {
  const listening = useUiStore((s) => s.listening);
  const setListening = useUiStore((s) => s.setListening);
  const transcript = useUiStore((s) => s.transcript);
  const setTranscript = useUiStore((s) => s.setTranscript);
  const pushToast = useUiStore((s) => s.pushToast);
  const handleRef = useRef<ListeningHandle | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!listening) return;
    if (!isRecognitionAvailable()) {
      pushToast({
        message: 'Reconnaissance vocale indisponible sur ce navigateur — utilise le champ texte de la page Voix.',
        duration: 6000,
      });
      setListening(false);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setTranscript('');
    const handle = startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          setListening(false);
          void handleVoiceCommand(text);
        }
      },
      () => {
        startedRef.current = false;
        handleRef.current = null;
        setListening(false);
      },
    );
    handleRef.current = handle;
    if (!handle) {
      startedRef.current = false;
      setListening(false);
    }
    return () => {
      handle?.stop();
      handleRef.current = null;
      startedRef.current = false;
    };
  }, [listening, pushToast, setListening, setTranscript]);

  const toggle = () => {
    if (listening) {
      handleRef.current?.stop();
      stopSpeaking();
      setListening(false);
    } else {
      setListening(true);
    }
  };

  return (
    <>
      {listening && (
        <div
          aria-live="polite"
          className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-fab max-w-[calc(100vw-2rem)] rounded-card bg-ink px-4 py-3 text-sm text-surface shadow-hover animate-slide-up md:bottom-28 md:right-8 md:max-w-xs"
        >
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-voice">Écoute en cours</p>
          <p>{transcript || 'Parle maintenant…'}</p>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? "Arrêter l'écoute vocale" : "Démarrer l'assistant vocal"}
        className={cx(
          'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-fab flex min-h-14 items-center gap-2.5 rounded-pill px-5 text-sm font-bold shadow-hover transition-all duration-normal ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voice focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.97]',
          'md:bottom-8 md:right-8',
          listening ? 'bg-voice text-onbright' : 'bg-primarydark text-surface hover:bg-primary',
        )}
      >
        {listening ? <Waves /> : <Mic size={20} aria-hidden />}
        {listening ? "J'écoute…" : 'Voix'}
      </button>
    </>
  );
}
