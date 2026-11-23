'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarPlus, Hand, PartyPopper } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardBody } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Logo } from '../../components/brand/logo';
import { formatDayShort, formatTimeFr, minutesOf, timeOf } from '../../lib/dates';
import { parseInput, type ParsedInput } from '../../lib/parser';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { playBlip } from '../../lib/voice';
import { cx } from '../../lib/utils';

const EVENT_SUGGESTIONS = ['sport demain 14h', 'médecin mardi 10h30 santé', '!lundi réunion'];

const STEPS = [
  { icon: Hand, title: 'Bienvenue sur Centeryou !', question: 'Comment tu t’appelles ?' },
  { icon: CalendarPlus, title: 'Raconte-moi ta vie', question: 'Ton premier événement ?' },
  { icon: PartyPopper, title: 'Tout est prêt', question: 'C’est parti !' },
] as const;

/**
 * Parcours d'accueil des nouveaux arrivants (après inscription) :
 * 3 étapes — prénom, premier événement en langage naturel (« sport demain 14h »),
 * puis « C’est parti ! » qui renvoie sur Aujourd’hui, où la séquence d'accueil
 * animée (résumé de la journée) s’affiche.
 */
export default function BienvenuePage() {
  const router = useRouter();
  const updateSettings = useStore((s) => s.updateSettings);
  const addTask = useStore((s) => s.addTask);
  const addEvent = useStore((s) => s.addEvent);
  const sounds = useStore((s) => s.settings.sounds);
  const pushToast = useUiStore((s) => s.pushToast);

  const [step, setStep] = useState(0);
  const [prenom, setPrenom] = useState('');
  const [eventText, setEventText] = useState('');
  const [firstEvent, setFirstEvent] = useState<ParsedInput | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const finish = () => {
    const p = prenom.trim();
    // on réinitialise la date de la séquence d'accueil pour qu'elle s'affiche à l'arrivée sur Aujourd’hui
    updateSettings({ ...(p ? { prenom: p } : {}), onboarded: true, welcomeShownDate: '' });
    router.replace('/');
  };

  const submitPrenom = (e: FormEvent) => {
    e.preventDefault();
    if (!prenom.trim()) return;
    setStep(1);
  };

  const submitEvent = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const p = parseInput(text);
    // cohérent avec la commande vocale « ajoute… » : une heure = événement, sinon tâche
    if (p.time) {
      const end = timeOf(Math.min(minutesOf(p.time) + 60, 24 * 60 - 1));
      addEvent({ title: p.title, date: p.date, start: p.time, end, category: p.category, repeat: 'jamais' });
    } else {
      addTask({ title: p.title, date: p.date, time: null, category: p.category, priority: p.priority });
    }
    if (sounds) playBlip(720);
    pushToast({
      message: `C’est noté : « ${p.title} » — ${formatDayShort(p.date)}${p.time ? ` à ${formatTimeFr(p.time)}` : ''}.`,
    });
    setFirstEvent(p);
    setEventText('');
    setStep(2);
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="flex flex-col items-center gap-6 py-4 md:py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <p className="text-sm font-bold uppercase tracking-wide text-primarydark">Étape {step + 1} sur 3</p>
        <div className="flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cx(
                'h-2 rounded-pill transition-all duration-normal ease-out',
                i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/50' : 'w-2 bg-line',
              )}
            />
          ))}
        </div>
      </div>

      <Card className="w-full max-w-lg">
        <CardBody className="pt-6">
          <div key={step} className="animate-slide-up flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-tile bg-primary/10 text-primarydark">
                <StepIcon size={26} aria-hidden />
              </span>
              <h1 className="text-2xl font-extrabold text-ink md:text-4xl">{STEPS[step].title}</h1>
              <p className="text-base font-semibold text-muted">{STEPS[step].question}</p>
            </div>

            {step === 0 && (
              <form onSubmit={submitPrenom} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  ref={inputRef}
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Ex. : Camille"
                  aria-label="Ton prénom"
                  maxLength={30}
                  autoComplete="given-name"
                  className="flex-1"
                />
                <Button type="submit" size="lg" disabled={!prenom.trim()} className="shrink-0">
                  Continuer <ArrowRight size={18} aria-hidden />
                </Button>
              </form>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitEvent(eventText);
                  }}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <Input
                    ref={inputRef}
                    value={eventText}
                    onChange={(e) => setEventText(e.target.value)}
                    placeholder="sport demain 14h…"
                    aria-label="Ton premier événement en langage naturel"
                    maxLength={140}
                    className="flex-1"
                  />
                  <Button type="submit" size="lg" disabled={!eventText.trim()} className="shrink-0">
                    <CalendarPlus size={18} aria-hidden /> Ajouter
                  </Button>
                </form>
                <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Exemples">
                  <span className="text-xs font-semibold text-muted">Essayer :</span>
                  {EVENT_SUGGESTIONS.map((s) => (
                    <Button key={s} variant="secondary" size="sm" onClick={() => submitEvent(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mx-auto min-h-11 rounded-pill px-3 text-sm font-semibold text-muted transition-colors duration-fast ease-out hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Passer cette étape
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col items-center gap-4 text-center">
                {firstEvent ? (
                  <p className="rounded-card border border-line/70 bg-bg px-4 py-3 text-sm text-ink">
                    <span className="font-bold">{prenom.trim()}</span>, ton premier événement{' '}
                    <span className="font-semibold text-primarydark">« {firstEvent.title} »</span> est noté pour{' '}
                    <span className="font-semibold">{formatDayShort(firstEvent.date)}</span>
                    {firstEvent.time ? (
                      <>
                        {' '}
                        à <span className="font-semibold">{formatTimeFr(firstEvent.time)}</span>
                      </>
                    ) : null}
                    .
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    Aucun événement pour l’instant — tu en ajouteras un en une phrase quand tu veux, par exemple « sport
                    demain 14h ».
                  </p>
                )}
                <Button size="lg" onClick={finish} className="w-full sm:w-auto">
                  <PartyPopper size={18} aria-hidden /> Découvrir mon planning
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <button
        type="button"
        onClick={() => {
          updateSettings({ onboarded: true, welcomeShownDate: '' });
          router.replace('/');
        }}
        className="min-h-11 rounded-pill px-3 text-sm font-semibold text-muted transition-colors duration-fast ease-out hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Passer l’introduction
      </button>
    </div>
  );
}
