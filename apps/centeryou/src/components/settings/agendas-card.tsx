'use client';

import { useRef, useState, type ChangeEvent } from 'react';

import { CalendarDays, Download, Upload } from 'lucide-react';

import type { IcsParseResult, IcsRefus } from '../../lib/ics';

import { useStore } from '../../lib/store';

import { useUiStore } from '../../lib/ui-store';

import { Button } from '../ui/button';

import { Card, CardBody, CardHeader } from '../ui/card';

// le module .ics n'est chargé que quand on clique (chunk lazy : premier chargement inchangé)
type IcsModule = typeof import('../../lib/ics');

type Phase = 'idle' | 'apercu' | 'rapport';

interface Apercu {
  nom: string;
  result: IcsParseResult;
}

interface Rapport {
  nom: string;
  importes: number;
  doublons: number;
  refuses: IcsRefus[];
  notes: string[];
}

const plur = (n: number, singulier: string, pluriel?: string) => (n > 1 ? pluriel ?? `${singulier}s` : singulier);

export function AgendasCard() {
  const pushToast = useUiStore((s) => s.pushToast);
  const icsInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [ignorerDoublons, setIgnorerDoublons] = useState(true);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [enCours, setEnCours] = useState(false);

  const onExportIcs = () => {
    void import('../../lib/ics').then((m: IcsModule) => {
      const s = useStore.getState();
      m.downloadIcs(m.buildIcs(s.events));
      pushToast({
        message:
          s.events.length > 0
            ? `Ton calendrier est exporté (${s.events.length} ${plur(s.events.length, 'événement')}) : le fichier centeryou-export.ics est téléchargé.`
            : 'Ton calendrier est exporté : le fichier centeryou-export.ics est téléchargé (il est encore vide).',
      });
    });
  };

  const onIcsFilePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setEnCours(true);
    try {
      const m = await import('../../lib/ics');
      let text: string;
      try {
        text = await m.readIcsFile(file);
      } catch (err) {
        pushToast({ message: err instanceof m.IcsError ? err.message : 'Impossible de lire ce fichier .ics. Aucune donnée n’a été modifiée.' });
        return;
      }
      let result: IcsParseResult;
      try {
        result = m.parseIcs(text);
      } catch (err) {
        pushToast({
          message: err instanceof m.IcsError ? err.message : "Ce fichier .ics n’a pas pu être lu. Aucune donnée n’a été modifiée.",
        });
        return;
      }
      setApercu({ nom: file.name, result });
      setPhase('apercu');
    } finally {
      setEnCours(false);
    }
  };

  const onConfirmerImport = () => {
    if (!apercu) return;
    void import('../../lib/ics').then((m: IcsModule) => {
      const { aImporter, doublons } = m.planImport(apercu.result, useStore.getState().events, ignorerDoublons);
      const ajoutes = useStore.getState().importEvents(aImporter);
      setRapport({ nom: apercu.nom, importes: ajoutes.length, doublons, refuses: apercu.result.refuses, notes: apercu.result.notes });
      setPhase('rapport');
      pushToast({
        message:
          ajoutes.length > 0
            ? `Import terminé : ${ajoutes.length} ${plur(ajoutes.length, 'événement')} ajouté${ajoutes.length > 1 ? 's' : ''} à ton planning.`
            : 'Import terminé : aucun nouvel événement (tout était déjà dans ton planning).',
      });
    });
  };

  const onAnnuler = () => {
    // un import annulé ne change rien
    setApercu(null);
    setPhase('idle');
  };

  // « X événements détectés » = événements réellement présents dans le fichier (après expansion des RRULE)
  const totalDetectes = apercu ? apercu.result.candidats.length + apercu.result.refuses.length : 0;
  const refusesApercu = apercu?.result.refuses ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <CalendarDays size={18} aria-hidden className="text-primary" /> Agendas
        </h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Le format .ics est le standard des calendriers : Google Calendar, Apple Calendrier et Outlook le lisent tous.
          Exporte ton planning pour le retrouver ailleurs, ou importe un fichier .ics existant pour le ramener chez
          Centeryou. Rien n’est supprimé, rien n’est remplacé : l’import ajoute simplement à ton planning.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" id="btn-exporter-ics" onClick={onExportIcs}>
            <Download size={16} aria-hidden /> Exporter mon calendrier (.ics)
          </Button>
          <Button variant="secondary" size="sm" id="btn-choisir-ics" onClick={() => icsInputRef.current?.click()} disabled={enCours}>
            <Upload size={16} aria-hidden /> Importer un fichier .ics
          </Button>
          <input
            ref={icsInputRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            aria-label="Choisir un fichier .ics"
            onChange={onIcsFilePicked}
          />
        </div>

        {phase === 'apercu' && apercu && (
          <div className="flex flex-col gap-3 rounded-card border border-line bg-bg px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {totalDetectes} {plur(totalDetectes, 'événement')} détecté{totalDetectes > 1 ? 's' : ''} dans « {apercu.nom} »
              {refusesApercu.length > 0
                ? ` — ${refusesApercu.length} ne ${refusesApercu.length > 1 ? 'pourront' : 'pourra'} pas être importé${refusesApercu.length > 1 ? 's' : ''} (voir le compte-rendu)`
                : ''}
              .
            </p>
            <label htmlFor="ics-ignorer-doublons" className="flex items-center gap-2 text-sm text-ink">
              <input
                id="ics-ignorer-doublons"
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-primary"
                checked={ignorerDoublons}
                onChange={(e) => setIgnorerDoublons(e.target.checked)}
              />
              Ignorer les doublons (titre, date et heure identiques)
            </label>
            <p className="text-xs text-muted">
              L’import ajoute ces événements à ton planning actuel : tes événements existants restent exactement tels
              quels. Tu peux encore annuler sans rien changer.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" id="btn-importer-ics" onClick={onConfirmerImport}>
                Importer
              </Button>
              <Button variant="ghost" size="sm" id="btn-annuler-ics" onClick={onAnnuler}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {phase === 'rapport' && rapport && (
          <div className="flex flex-col gap-2 rounded-card border border-line bg-bg px-4 py-3">
            <p className="text-sm font-semibold text-ink">Import de « {rapport.nom} » terminé</p>
            <ul className="flex flex-col gap-1 text-sm text-ink">
              <li>
                <span className="font-semibold text-voicetext">{rapport.importes}</span> {plur(rapport.importes, 'événement')} importé
                {rapport.importes > 1 ? 's' : ''}
              </li>
              <li>
                <span className="font-semibold">{rapport.doublons}</span> ignoré{rapport.doublons > 1 ? 's' : ''} (doublon
                {rapport.doublons > 1 ? 's' : ''})
              </li>
              <li>
                <span className="font-semibold">{rapport.refuses.length}</span> refusé{rapport.refuses.length > 1 ? 's' : ''}{' '}
                (incomplet{rapport.refuses.length > 1 ? 's' : ''} ou impossible à représenter)
              </li>
            </ul>
            {rapport.refuses.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-line pt-2 text-xs text-muted">
                {rapport.refuses.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    « {r.titre} » — {r.raison}
                  </li>
                ))}
                {rapport.refuses.length > 5 && <li>… et {rapport.refuses.length - 5} autre{rapport.refuses.length > 6 ? 's' : ''}.</li>}
              </ul>
            )}
            {rapport.notes.map((n, i) => (
              <p key={i} className="text-xs text-muted">
                {n}
              </p>
            ))}
            <div>
              <Button variant="secondary" size="sm" id="btn-fermer-rapport-ics" onClick={() => setPhase('idle')}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
