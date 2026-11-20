'use client';

import { Dialog } from './ui/dialog';
import { useUiStore } from '../lib/ui-store';

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: 'N', desc: 'Nouvel événement' },
  { keys: 'T', desc: 'Saisie rapide de tâche' },
  { keys: 'V', desc: 'Assistant vocal (écouter / arrêter)' },
  { keys: '1 / 2 / 3', desc: 'Vues Jour / Semaine / Mois du planning' },
  { keys: '?', desc: 'Cette aide' },
  { keys: 'Échap', desc: 'Fermer la fenêtre active' },
];

const VOICE_COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: '« ajoute sport demain 14h »', desc: 'crée un événement' },
  { cmd: '« mon programme »', desc: 'lit ta journée' },
  { cmd: '« quoi de prévu demain ? »', desc: 'lit demain' },
  { cmd: '« c’est fait sport »', desc: 'coche une tâche' },
];

export function HelpDialog() {
  const open = useUiStore((s) => s.helpOpen);
  const setOpen = useUiStore((s) => s.setHelpOpen);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Aide & raccourcis">
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 text-sm font-bold text-ink">Raccourcis clavier</h3>
          <ul className="flex flex-col gap-1.5">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center gap-3 text-sm">
                <kbd className="min-w-16 rounded-card border border-line bg-bg px-2 py-1 text-center text-xs font-bold text-ink">
                  {s.keys}
                </kbd>
                <span className="text-muted">{s.desc}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-bold text-ink">Commandes vocales</h3>
          <ul className="flex flex-col gap-1.5">
            {VOICE_COMMANDS.map((c) => (
              <li key={c.cmd} className="flex items-center gap-3 text-sm">
                <code className="rounded-pill bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primarydark">
                  {c.cmd}
                </code>
                <span className="text-muted">{c.desc}</span>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-muted">
          Astuce : dans le planning, clique sur un créneau pour créer un événement, glisse un événement pour le déplacer.
          Saisie rapide : « sport demain 14h », « médecin mardi 10h30 santé », « !lundi réunion ».
        </p>
      </div>
    </Dialog>
  );
}
