'use client';

import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { VoicePanel } from '../../components/voice/voice-panel';

const COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: '« ajoute sport demain 14h »', desc: 'crée un événement (même parseur que l’ajout rapide)' },
  { cmd: '« mon programme » / « que dois-je faire aujourd’hui ? »', desc: 'lit ton programme du jour' },
  { cmd: '« quoi de prévu demain ? »', desc: 'lit ton programme de demain' },
  { cmd: '« c’est fait sport »', desc: 'coche la tâche correspondante et te félicite' },
];

export default function VoixPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Voix</h1>
        <p className="mt-1 text-sm font-semibold text-muted">
          Parle à Centeryou — ou écris ta commande si ton navigateur ne reconnaît pas la parole.
        </p>
      </div>

      <Card>
        <CardBody className="pt-6">
          <VoicePanel />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink">Commandes comprises</h2>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col gap-2.5">
            {COMMANDS.map((c) => (
              <li key={c.cmd} className="flex flex-col gap-0.5 rounded-card border border-line/70 bg-bg/60 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                <code className="shrink-0 rounded-pill bg-surface px-3 py-1 text-sm font-semibold text-primarydark">
                  {c.cmd}
                </code>
                <span className="text-sm text-muted">{c.desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Voix premium (servie par le serveur, clé jamais exposée) : illimitée avec l’offre Premium, ou{' '}
            {3} essais gratuits par mois en Découverte. Sinon, Centeryou bascule automatiquement sur la synthèse
            vocale de ton navigateur (français), sans erreur.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
