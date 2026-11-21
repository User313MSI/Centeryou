'use client';

import { useState, type FormEvent } from 'react';
import { Mic, SendHorizonal } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Waves } from '../brand/waves';
import { useUiStore } from '../../lib/ui-store';
import { useStore } from '../../lib/store';
import { handleVoiceCommand } from '../../lib/voice-commands';
import { isRecognitionAvailable, stopSpeaking } from '../../lib/voice';
import { cx } from '../../lib/utils';

const EXAMPLES = [
  'Ajoute sport demain 14h',
  'Mon programme',
  'Quoi de prévu demain ?',
  "C'est fait sport",
];

export function VoicePanel() {
  const [value, setValue] = useState('');
  const listening = useUiStore((s) => s.listening);
  const setListening = useUiStore((s) => s.setListening);
  const transcript = useUiStore((s) => s.transcript);
  const lastReply = useUiStore((s) => s.lastReply);
  const voiceEnabled = useStore((s) => s.settings.voice);
  const recognitionOk = isRecognitionAvailable();

  const run = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setValue('');
    void handleVoiceCommand(t);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(value);
  };

  const toggleMic = () => {
    if (listening) stopSpeaking();
    setListening(!listening);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        onClick={toggleMic}
        aria-pressed={listening}
        aria-label={listening ? "Arrêter l'écoute" : "Parler à l'assistant vocal"}
        className={cx(
          'flex h-24 w-24 items-center justify-center rounded-pill shadow-hover transition-all duration-normal ease-out',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-95',
          listening ? 'bg-voice text-onbright' : 'bg-primarydark text-surface hover:brightness-95',
        )}
      >
        {listening ? <Waves className="h-10 w-10" /> : <Mic size={34} aria-hidden />}
      </button>

      <div className="min-h-14 w-full max-w-md rounded-card border border-line bg-surface px-4 py-3 text-center shadow-card" aria-live="polite">
        {listening ? (
          <p className="text-sm text-ink">{transcript || 'Parle maintenant…'}</p>
        ) : lastReply ? (
          <p className="text-sm text-ink">« {lastReply} »</p>
        ) : (
          <p className="text-sm text-muted">Dis une commande, ou tape-la ci-dessous.</p>
        )}
      </div>

      {!recognitionOk && (
        <p className="w-full max-w-md rounded-card bg-warning/15 px-4 py-3 text-center text-sm text-ink" role="status">
          La reconnaissance vocale n’est pas disponible sur ce navigateur (Chrome/Edge recommandés) : le champ texte
          ci-dessous fonctionne partout.
        </p>
      )}
      {!voiceEnabled && (
        <p className="w-full max-w-md rounded-card bg-line/60 px-4 py-3 text-center text-sm text-ink" role="status">
          Le réglage « Assistant vocal » est désactivé : les réponses s’affichent en texte dans cette fenêtre.
        </p>
      )}

      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Écris ta commande : « ajoute sport demain 14h »…"
          aria-label="Commande vocale écrite (secours)"
          maxLength={140}
        />
        <Button type="submit" className="shrink-0">
          <SendHorizonal size={18} aria-hidden /> Envoyer
        </Button>
      </form>

      <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => run(ex)}
            className="min-h-11 rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-muted transition-all duration-fast ease-out hover:border-primary hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
