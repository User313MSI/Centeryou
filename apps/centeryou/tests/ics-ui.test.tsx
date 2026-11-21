import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/reglages',
}));

import ReglagesPage from '../src/app/reglages/page';

import { defaultSettings } from '../src/lib/defaults';

import { useStore } from '../src/lib/store';

import { useUiStore } from '../src/lib/ui-store';

const CRLF = '\r\n';

function vevent(inner: string): string {
  return `BEGIN:VEVENT${CRLF}${inner}${CRLF}END:VEVENT${CRLF}`;
}

function calendar(...blocks: string[]): string {
  return `BEGIN:VCALENDAR${CRLF}VERSION:2.0${CRLF}PRODID:-//Test//Test//FR${CRLF}${blocks.join('')}END:VCALENDAR${CRLF}`;
}

const SPORT_ICS = vevent(`UID:sport@x${CRLF}DTSTAMP:20250101T000000Z${CRLF}SUMMARY:Sport${CRLF}DTSTART:20250107T140000${CRLF}DTEND:20250107T150000`);
const DENTISTE_ICS = vevent(`UID:dent@x${CRLF}DTSTAMP:20250101T000000Z${CRLF}SUMMARY:Dentiste${CRLF}DTSTART:20250108T103000${CRLF}DTEND:20250108T110000`);

function fileIcs(nom: string, contenu: string): File {
  return new File([contenu], nom, { type: 'text/calendar' });
}

function inputIcs(): HTMLInputElement {
  return screen.getByLabelText('Choisir un fichier .ics') as HTMLInputElement;
}

/** textes des lignes de liste du compte-rendu (le nombre est dans un <span>) */
function lignesRapport(): string[] {
  return screen.getAllByRole('listitem').map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim());
}

async function choisirFichier(f: File) {
  fireEvent.change(inputIcs(), { target: { files: [f] } });
}

beforeEach(() => {
  window.localStorage.clear();
  useUiStore.setState({ toasts: [] });
  useStore.setState({
    events: [
      { id: 'e1', title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'jamais', createdAt: 1 },
    ],
    tasks: [],
    settings: { ...defaultSettings, prenom: 'Camille' },
    hydrated: true,
  });
});

describe('Réglages — carte « Agendas » (.ics, M-07)', () => {
  it('état initial (1/3) : la carte et ses deux boutons sont affichés', () => {
    render(<ReglagesPage />);
    expect(screen.getByRole('heading', { name: /agendas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exporter mon calendrier \(\.ics\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importer un fichier \.ics/i })).toBeInTheDocument();
    // pas d'aperçu ni de rapport au départ
    expect(screen.queryByRole('button', { name: /^importer$/i })).not.toBeInTheDocument();
  });

  it('export : déclenche le téléchargement de centeryou-export.ics en text/calendar CRLF', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    let anchor: HTMLAnchorElement | null = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anchor = this;
    });
    render(<ReglagesPage />);
    fireEvent.click(screen.getByRole('button', { name: /exporter mon calendrier \(\.ics\)/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(anchor!.download).toBe('centeryou-export.ics');
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(blob);
    });
    expect(text.startsWith(`BEGIN:VCALENDAR${CRLF}`)).toBe(true);
    expect(text).toContain(`SUMMARY:Sport${CRLF}`);
    expect(text).toContain(`DTSTART:20250107T140000${CRLF}`);
    expect(text).not.toMatch(/[^\r]\n/);
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.message.includes('exporté'))).toBe(true));
    clickSpy.mockRestore();
    createObjectURL.mockRestore();
  });

  it('import : les 3 états — aperçu « X événements détectés » + coche doublons → Importer → compte-rendu FR', async () => {
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('mon-cal.ics', calendar(SPORT_ICS + DENTISTE_ICS)));

    // état 2/3 : aperçu
    expect(await screen.findByText(/2 événements détectés dans « mon-cal.ics »/)).toBeInTheDocument();
    const coche = screen.getByLabelText(/ignorer les doublons/i) as HTMLInputElement;
    expect(coche.checked).toBe(true);

    // état 3/3 : import (le doublon Sport existe déjà dans le store)
    fireEvent.click(screen.getByRole('button', { name: /^importer$/i }));
    expect(await screen.findByText(/Import de « mon-cal.ics » terminé/)).toBeInTheDocument();
    const lignes = lignesRapport();
    expect(lignes.some((t) => t.includes('1 événement importé'))).toBe(true);
    expect(lignes.some((t) => t.includes('1 ignoré (doublon)'))).toBe(true);
    expect(lignes.some((t) => t.includes('0 refusé'))).toBe(true);

    // le store a été AUGMENTÉ, pas remplacé : Sport d'origine toujours là, Dentiste ajouté
    const events = useStore.getState().events;
    expect(events.map((e) => e.title)).toEqual(['Sport', 'Dentiste']);
    expect(events[1]).toMatchObject({ date: '2025-01-08', start: '10:30', end: '11:00', category: 'autre', repeat: 'jamais' });
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.message.includes('Import terminé'))).toBe(true));

    // « Fermer » ramène à l'état initial
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(screen.getByRole('button', { name: /exporter mon calendrier \(\.ics\)/i })).toBeInTheDocument();
  });

  it('case « ignorer les doublons » décochée : tout est importé', async () => {
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('a.ics', calendar(SPORT_ICS)));
    expect(await screen.findByText(/1 événement détecté/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/ignorer les doublons/i));
    fireEvent.click(screen.getByRole('button', { name: /^importer$/i }));
    await waitFor(() => expect(useStore.getState().events).toHaveLength(2));
    const lignes = await screen.findAllByRole('listitem');
    const textes = lignes.map((li) => (li.textContent ?? '').replace(/\s+/g, ' '));
    expect(textes.some((t) => t.includes('1 événement importé'))).toBe(true);
    expect(textes.some((t) => t.includes('0 ignoré (doublon)'))).toBe(true);
  });

  it('annuler avant l’import ne change rien', async () => {
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('a.ics', calendar(DENTISTE_ICS)));
    expect(await screen.findByText(/1 événement détecté/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(useStore.getState().events.map((e) => e.title)).toEqual(['Sport']);
    expect(screen.queryByText(/1 événement détecté/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exporter mon calendrier \(\.ics\)/i })).toBeInTheDocument();
  });

  it('fichier corrompu choisi → toast FR propre, aucune modification, retour à l’état initial', async () => {
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('faux.ics', 'ceci n’est pas un calendrier {{{'));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.some((t) => t.message.includes('BEGIN:VCALENDAR') && t.message.includes('Aucune donnée'))).toBe(true),
    );
    expect(useStore.getState().events.map((e) => e.title)).toEqual(['Sport']);
    expect(screen.queryByText(/événement détecté/)).not.toBeInTheDocument();
  });

  it('fichier vide → toast FR « vide », rien ne change', async () => {
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('vide.ics', ''));
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.message.includes('vide'))).toBe(true));
    expect(useStore.getState().events).toHaveLength(1);
  });

  it('fichier trop gros (> 1 Mo) choisi → refusé proprement, rien ne change', async () => {
    render(<ReglagesPage />);
    const gros = new File([new Uint8Array(1024 * 1024 + 1)], 'gros.ics', { type: 'text/calendar' });
    await choisirFichier(gros);
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.message.includes('trop volumineux') && t.message.includes('1 Mo'))).toBe(true));
    expect(useStore.getState().events).toHaveLength(1);
    expect(screen.queryByText(/événement détecté/)).not.toBeInTheDocument();
  });

  it('calendrier sans événement → toast FR, aucune modification', async () => {
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('rien.ics', calendar()));
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.message.includes('aucun événement'))).toBe(true));
    expect(useStore.getState().events).toHaveLength(1);
  });

  it('événement de nuit (traverse minuit) → refusé avec compte-rendu honnête, non importé', async () => {
    const nuit = vevent(`SUMMARY:Soirée${CRLF}DTSTART:20250110T230000${CRLF}DTEND:20250111T020000`);
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('nuit.ics', calendar(nuit + DENTISTE_ICS)));
    expect(await screen.findByText(/2 événements détectés/)).toBeInTheDocument();
    expect(screen.getByText(/1 ne pourra pas être importé/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^importer$/i }));
    expect(await screen.findByText(/Import de « nuit.ics » terminé/)).toBeInTheDocument();
    const lignes = lignesRapport();
    expect(lignes.some((t) => t.includes('1 événement importé'))).toBe(true);
    expect(lignes.some((t) => t.includes('1 refusé'))).toBe(true);
    expect(lignes.some((t) => t.includes('traverse minuit'))).toBe(true);
    expect(lignes.some((t) => t.includes('événements de nuit'))).toBe(true);
    // seul Dentiste est entré ; Sport d'origine intact
    expect(useStore.getState().events.map((e) => e.title)).toEqual(['Sport', 'Dentiste']);
  });

  it('RRULE COUNT=2 → 2 occurrences importées', async () => {
    const recurrent = vevent(`SUMMARY:Sport${CRLF}DTSTART:20250107T140000${CRLF}DTEND:20250107T150000${CRLF}RRULE:FREQ=DAILY;COUNT=2`);
    render(<ReglagesPage />);
    await choisirFichier(fileIcs('rec.ics', calendar(recurrent)));
    expect(await screen.findByText(/2 événements détectés/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/ignorer les doublons/i)); // décocher : le 1er occurrence = doublon de Sport
    fireEvent.click(screen.getByRole('button', { name: /^importer$/i }));
    await waitFor(() => expect(useStore.getState().events).toHaveLength(3));
    expect(useStore.getState().events.map((e) => e.date).sort()).toEqual(['2025-01-07', '2025-01-07', '2025-01-08']);
  });
});
