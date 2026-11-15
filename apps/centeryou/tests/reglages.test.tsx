import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/reglages',
}));
import ReglagesPage from '../src/app/reglages/page';
import { parseBackup, serializeBackup } from '../src/lib/backup';
import { defaultSettings } from '../src/lib/defaults';
import { useStore } from '../src/lib/store';
import { useUiStore } from '../src/lib/ui-store';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(blob);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  useUiStore.setState({ toasts: [] });
  useStore.setState({
    events: [
      { id: 'e1', title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'jamais', createdAt: 1 },
    ],
    tasks: [
      { id: 't1', title: 'Rapport', date: '2025-01-10', time: null, category: 'travail', priority: 'haute', done: false, createdAt: 2 },
    ],
    settings: { ...defaultSettings, prenom: 'Camille' },
    hydrated: true,
  });
});

describe('Réglages — sauvegarde manuelle', () => {
  it('affiche les boutons « Sauvegarder mes données » et « Restaurer »', () => {
    render(<ReglagesPage />);
    expect(screen.getByRole('button', { name: /sauvegarder mes données/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restaurer une sauvegarde/i })).toBeInTheDocument();
  });

  it('« Sauvegarder mes données » exporte un JSON valide contenant les vraies données', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ReglagesPage />);
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder mes données/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const json = await readBlobText(blob);
    const payload = parseBackup(json);
    expect(payload.app).toBe('centeryou');
    expect(payload.events.map((e) => e.title)).toEqual(['Sport']);
    expect(payload.tasks.map((t) => t.title)).toEqual(['Rapport']);
    expect(payload.settings.prenom).toBe('Camille');
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('exportée'))).toBe(true);
    clickSpy.mockRestore();
    createObjectURL.mockRestore();
  });

  it('« Restaurer » applique le fichier seulement après confirmation', async () => {
    const backupJson = serializeBackup({
      events: [
        { id: 'e9', title: 'Dentist', date: '2025-01-08', start: '10:30', end: '11:00', category: 'sante', repeat: 'jamais', createdAt: 9 },
      ],
      tasks: [],
      settings: { ...defaultSettings, prenom: 'Léa' },
    });
    render(<ReglagesPage />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    const file = new File([backupJson], 'centeryou-sauvegarde-2025-01-06.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    // rien n'est appliqué tant que l'on n'a pas confirmé
    expect(useStore.getState().events[0].title).toBe('Sport');
    const confirmBtn = await screen.findByRole('button', { name: /confirmer la restauration/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(useStore.getState().events.map((e) => e.title)).toEqual(['Dentist']));
    expect(useStore.getState().settings.prenom).toBe('Léa');
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('restaurée'))).toBe(true);
  });

  it('fichier invalide -> message clair, données inchangées', async () => {
    render(<ReglagesPage />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pas du json'], 'faux.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(useUiStore.getState().toasts.some((t) => t.message.includes('JSON invalide'))).toBe(true),
    );
    expect(useStore.getState().events[0].title).toBe('Sport');
    expect(screen.queryByRole('button', { name: /confirmer la restauration/i })).not.toBeInTheDocument();
  });

  it('réglages : modifier le prénom et la séquence d’accueil met à jour le store', () => {
    render(<ReglagesPage />);
    const prenom = screen.getByLabelText(/ton prénom/i);
    fireEvent.change(prenom, { target: { value: 'Nadia' } });
    expect(useStore.getState().settings.prenom).toBe('Nadia');
    const welcome = screen.getByLabelText(/séquence d’accueil/i);
    fireEvent.change(welcome, { target: { value: 'off' } });
    expect(useStore.getState().settings.welcomeSequence).toBe('off');
  });
});
