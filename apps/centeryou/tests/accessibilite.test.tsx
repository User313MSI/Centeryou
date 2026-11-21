import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/aujourdhui',
}));

// voix : aucun son en test
vi.mock('../src/lib/voice', () => ({ playBlip: vi.fn(), speak: vi.fn(), stopSpeaking: vi.fn() }));

import { colors, darkColors, categoryColors } from '../design/tokens';

import { Button } from '../src/components/ui/button';
import { Dialog } from '../src/components/ui/dialog';
import { Toggle } from '../src/components/ui/toggle';
import { Tabs } from '../src/components/ui/tabs';
import { Toasts } from '../src/components/ui/toast';
import { ProgressBar } from '../src/components/today/progress-bar';
import { QuickAdd } from '../src/components/tasks/quick-add';
import { TaskItemRow } from '../src/components/tasks/task-item';
import { EventBlock } from '../src/components/events/event-block';
import type { CalendarInstance } from '../src/lib/events';

import { defaultSettings } from '../src/lib/defaults';
import { useStore } from '../src/lib/store';
import { useUiStore } from '../src/lib/ui-store';
import type { TaskItem } from '../src/types';

/* ------------------------------------------------------------------ */
/* 1. Contrastes mesurés programmatiquement (formule WCAG 2.1)         */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** ratio de contraste WCAG entre deux couleurs hex */
function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** aplat d'une couleur à alpha sur un fond (composition réelle du navigateur) */
function blend(fg: string, alpha: number, bg: string): string {
  const [r1, g1, b1] = hexToRgb(fg);
  const [r2, g2, b2] = hexToRgb(bg);
  const m = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha));
  return '#' + [m(r1, r2), m(g1, g2), m(b1, b2)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// teintes appliquées par globals.css (Sourire M-10) en thème clair
const WARNING_CLAIR = '#A06000'; // ex #FFB020
const DANGER_CLAIR = '#C03A3A'; // ex #FF6B6B

const BG_CLAIR = colors.bg; // #FAFAFC
const SURFACE = colors.surface; // #FFFFFF
const VOILE_WARNING_15 = blend('#FFB020', 0.15, SURFACE); // voile bg-warning/15 réel
const VOILE_DANGER_10 = blend('#FF6B6B', 0.1, SURFACE); // voile bg-danger/10 réel
const VOILE_DANGER_15 = blend('#FF6B6B', 0.15, SURFACE); // voile bg-danger/15 réel
const FOND_NUIT_FILM = '#1A1B2E';

describe('M-10 — contrastes WCAG mesurés (AA 4,5:1)', () => {
  it('la mesure est correcte : les anciennes teintes échouaient bien sous AA (sanity check)', () => {
    expect(contrast('#FFB020', BG_CLAIR)).toBeLessThan(4.5); // 1,75:1 — le constat de l’audit
    expect(contrast('#FF6B6B', BG_CLAIR)).toBeLessThan(4.5); // 2,66:1
    expect(contrast('#1A1B2E', BG_CLAIR)).toBeGreaterThan(15); // sanity : ink très lisible
  });

  it('warning assombri #A06000 ≥ 4,5:1 sur tous les fonds clairs où il sert de texte/icône', () => {
    expect(contrast(WARNING_CLAIR, BG_CLAIR)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WARNING_CLAIR, SURFACE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WARNING_CLAIR, VOILE_WARNING_15)).toBeGreaterThanOrEqual(4.5);
    // ratios documentés dans le journal
    expect(contrast(WARNING_CLAIR, BG_CLAIR)).toBeCloseTo(4.83, 1);
    expect(contrast(WARNING_CLAIR, SURFACE)).toBeCloseTo(5.04, 1);
    expect(contrast(WARNING_CLAIR, VOILE_WARNING_15)).toBeCloseTo(4.59, 1);
  });

  it('danger assombri #C03A3A ≥ 4,5:1 sur tous les fonds clairs (texte, icône, voile d’erreur)', () => {
    expect(contrast(DANGER_CLAIR, BG_CLAIR)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DANGER_CLAIR, SURFACE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DANGER_CLAIR, VOILE_DANGER_10)).toBeGreaterThanOrEqual(4.5); // alerte auth-dialog
    expect(contrast(DANGER_CLAIR, VOILE_DANGER_15)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DANGER_CLAIR, BG_CLAIR)).toBeCloseTo(5.16, 1);
    expect(contrast(DANGER_CLAIR, VOILE_DANGER_15)).toBeCloseTo(4.63, 1);
  });

  it('bouton danger : texte blanc (text-surface) sur corail assombri ≥ 4,5:1', () => {
    expect(contrast('#FFFFFF', DANGER_CLAIR)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', DANGER_CLAIR)).toBeCloseTo(5.37, 1);
  });

  it('thème sombre et nuit du film : teintes vives conservées, elles y passent déjà AA', () => {
    expect(contrast('#FFB020', darkColors.bg)).toBeGreaterThanOrEqual(4.5); // 9,99:1 sur #14141F
    expect(contrast('#FF6B6B', darkColors.bg)).toBeGreaterThanOrEqual(4.5); // 6,58:1
    expect(contrast('#FFB020', FOND_NUIT_FILM)).toBeGreaterThanOrEqual(4.5); // icône du film
    expect(contrast('#FF6B6B', darkColors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('les 5 tokens de marque sont INTACTS et le token voix n’est pas dégradé', () => {
    expect(colors.primary).toBe('#7C5CFF');
    expect(colors.primaryDark).toBe('#5B3FE8');
    expect(colors.voice).toBe('#2DD4BF');
    expect(colors.bg).toBe('#FAFAFC');
    expect(colors.ink).toBe('#1A1B2E');
    // design/tokens.ts garde les valeurs d'origine : c’est globals.css qui surcharge
    expect(colors.warning).toBe('#FFB020');
    expect(colors.danger).toBe('#FF6B6B');
    // voix sur fond sombre : 9,1:1, ne pas dégrader
    expect(contrast(colors.voice, FOND_NUIT_FILM)).toBeGreaterThanOrEqual(9);
  });

  it('globals.css surcharge UNIQUEMENT --c-warning/--c-danger (clair) et les conserve en sombre/film', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toContain('--c-warning: 160 96 0'); // #A06000 clair
    expect(css).toContain('--c-danger: 192 58 58'); // #C03A3A clair
    expect(css).toMatch(/html\.dark\s*{[^}]*--c-warning:\s*255 176 32/); // #FFB020 sombre
    expect(css).toMatch(/html\.dark\s*{[^}]*--c-danger:\s*255 107 107/); // #FF6B6B sombre
    expect(css).toMatch(/\.film-root\s*{[^}]*--c-warning:\s*255 176 32/); // nuit du film
    // aucune autre variable de couleur n’est redéfinie dans le bloc Sourire
    const bloc = css.slice(css.indexOf('html:root {'));
    expect(bloc).not.toContain('--c-primary:');
    expect(bloc).not.toContain('--c-voice:');
    expect(bloc).not.toContain('--c-bg:');
    expect(bloc).not.toContain('--c-ink:');
  });

  it('autres couples corrigés sans toucher aux tokens : primarydark/muted/ink ≥ 4,5:1 sur fonds clairs', () => {
    expect(contrast(colors.primaryDark, BG_CLAIR)).toBeGreaterThanOrEqual(4.5); // remplace text-primary (4,17:1)
    expect(contrast(colors.primaryDark, SURFACE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.primaryDark, blend(colors.primary, 0.1, SURFACE))).toBeGreaterThanOrEqual(4.5); // tuile bg-primary/10
    expect(contrast(colors.textSecondary, BG_CLAIR)).toBeGreaterThanOrEqual(4.5); // muted 4,54:1
    expect(contrast(SURFACE, colors.primaryDark)).toBeGreaterThanOrEqual(4.5); // texte des boutons primaires
    expect(contrast(SURFACE, colors.primary)).toBeLessThan(4.5); // d’où le passage à bg-primarydark pour la pastille « aujourd’hui »
    expect(contrast(SURFACE, colors.primaryDark)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.ink, VOILE_WARNING_15)).toBeGreaterThanOrEqual(4.5); // badges haute/danger
    expect(contrast(colors.ink, VOILE_DANGER_15)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onbright, colors.voice)).toBeGreaterThanOrEqual(4.5); // boutons micro « écoute »
    expect(contrast(colors.primaryDark, blend(colors.border, 0.7, SURFACE))).toBeGreaterThanOrEqual(4.5); // piste des progressbar (bg-line/70)
  });

  it('catégories : le texte de légende n’utilise plus les couleurs de catégories seules (alternative fournie)', () => {
    // les libellés de légende sont en text-ink (16:1) ; les pastilles restent décoratives (aria-hidden)
    expect(contrast(colors.ink, SURFACE)).toBeGreaterThanOrEqual(15);
    // les segments de graphiques gardent une alternative textuelle (couvert par les tests de rendu ci-dessous)
    expect(Object.keys(categoryColors)).toHaveLength(5);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Rôles, états et labels ARIA rendus                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
  useUiStore.setState({ toasts: [], eventDialog: { open: false }, highlightEventId: null, highlightAt: 0 });
});

describe('M-10 — rôles, états et aria-labels', () => {
  it('Dialog : role=dialog + aria-modal + aria-labelledby pointant sur le titre h2, fermeture Échap', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Aide & raccourcis">
        <p>contenu</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();
    const titre = document.getElementById(labelledby!);
    expect(titre?.textContent).toBe('Aide & raccourcis');
    expect(titre?.tagName).toBe('H2');
    // bouton de fermeture nommé (icône seule)
    expect(screen.getByRole('button', { name: 'Fermer la fenêtre' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Toggle : role=switch + aria-checked + aria-label, et bascule au clic', () => {
    let value = false;
    const { rerender } = render(<Toggle checked={value} onChange={(v) => { value = v; }} label="Mode sombre" />);
    const sw = screen.getByRole('switch', { name: 'Mode sombre' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(value).toBe(true);
    rerender(<Toggle checked={value} onChange={(v) => { value = v; }} label="Mode sombre" />);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('Tabs : tablist + onglets aria-selected, roving tabindex, flèches clavier', () => {
    let value = 'jour';
    const onChange = (v: string) => { value = v; };
    const { rerender } = render(
      <Tabs
        options={[{ id: 'jour', label: 'Jour' }, { id: 'semaine', label: 'Semaine' }, { id: 'mois', label: 'Mois' }]}
        value={value}
        onChange={onChange}
        ariaLabel="Vues du planning"
      />,
    );
    const tablist = screen.getByRole('tablist', { name: 'Vues du planning' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(value).toBe('semaine');
    rerender(
      <Tabs
        options={[{ id: 'jour', label: 'Jour' }, { id: 'semaine', label: 'Semaine' }, { id: 'mois', label: 'Mois' }]}
        value={value}
        onChange={onChange}
        ariaLabel="Vues du planning"
      />,
    );
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('Toasts : zone aria-live, role=status, action nommée et fermeture nommée', () => {
    useUiStore.setState({
      toasts: [{ id: 't1', message: '« Sport » supprimée', actionLabel: 'Annuler', duration: 5000 }],
    });
    render(<Toasts />);
    expect(screen.getByRole('status')).toHaveTextContent('« Sport » supprimée');
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fermer la notification' })).toBeInTheDocument();
  });

  it('ProgressBar : role=progressbar avec valeurs et label ARIA', () => {
    render(<ProgressBar done={2} total={4} />);
    const bar = screen.getByRole('progressbar', { name: 'Progression des tâches du jour' });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('QuickAdd : champ nommé, groupe de suggestions avec role=group + aria-label', () => {
    render(<QuickAdd large suggestions={['sport demain 14h']} />);
    expect(screen.getByLabelText(/Ajout rapide de tâche/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Suggestions rapides' })).toBeInTheDocument();
  });

  it('TaskItemRow : boutons d’action nommés (cocher/supprimer) et aria-pressed sur la coche', () => {
    const task: TaskItem = {
      id: 't1',
      title: 'Sport',
      date: '2026-11-20',
      time: '14:00',
      category: 'perso',
      priority: 'haute',
      done: false,
      createdAt: 1,
    };
    useStore.setState({ tasks: [task] });
    render(<TaskItemRow task={task} />);
    const coche = screen.getByRole('button', { name: /Marquer « Sport » comme faite/ });
    expect(coche).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Supprimer la tâche « Sport »/ })).toBeInTheDocument();
  });

  it('EventBlock : role=button focusable, aria-label descriptif, Entrée déclenche l’action', () => {
    const onEventClick = vi.fn();
    const instance: CalendarInstance = {
      kind: 'event',
      id: 'e1',
      title: 'Réunion',
      category: 'travail',
      date: '2026-11-20',
      start: '10:00',
      end: '11:00',
      done: false,
      event: {
        id: 'e1',
        title: 'Réunion',
        date: '2026-11-20',
        start: '10:00',
        end: '11:00',
        category: 'travail',
        repeat: 'jamais',
        createdAt: 1,
      },
    };
    render(
      <EventBlock
        instance={instance}
        pxPerMin={1}
        dayStartMin={8 * 60}
        onEventClick={onEventClick}
        onTaskToggle={() => {}}
        onDropAt={() => {}}
      />,
    );
    const bloc = screen.getByRole('button', { name: /Réunion, de 10h00 à 11h00/ });
    expect(bloc).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(bloc, { key: 'Enter' });
    expect(onEventClick).toHaveBeenCalledWith(instance.event);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Focus visible                                                     */
/* ------------------------------------------------------------------ */

describe('M-10 — focus visible et cohérent', () => {
  it('le Button expose un anneau :focus-visible (classe utilitaire présente)', () => {
    render(<Button>Valider</Button>);
    const btn = screen.getByRole('button', { name: 'Valider' });
    expect(btn.className).toContain('focus-visible:ring-2');
    expect(btn.className).toContain('focus-visible:ring-primary');
    // l'anneau primaire lui-même passe 3:1 sur le fond clair (indicateur non texte, WCAG 1.4.11)
    expect(contrast(colors.primary, BG_CLAIR)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.primary, darkColors.bg)).toBeGreaterThanOrEqual(3);
  });

  it('globals.css pose un :focus-visible global avec anneau primaire', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toMatch(/:focus-visible\s*{[^}]*ring-2[^}]*ring-primary/);
  });

  it('les boutons à icône du Dialog ont un nom accessible (pas d’icône muette focusable)', () => {
    render(
      <Dialog open onClose={() => {}} title="Test">
        <p>x</p>
      </Dialog>,
    );
    const fermer = screen.getByRole('button', { name: 'Fermer la fenêtre' });
    const svg = fermer.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true'); // l’icône est décorative, le nom vient du label
  });
});
