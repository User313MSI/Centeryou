import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/planning',
}));

import { EventDialog } from '../src/components/events/event-dialog';

import { defaultSettings } from '../src/lib/defaults';

import { useStore } from '../src/lib/store';

import { useUiStore } from '../src/lib/ui-store';

import type { EventItem } from '../src/types';

// date de test dans le futur : jamais écrasée par le clamp « maintenant » du jour réel
const FUT = '2026-12-01';

function ev(id: string, date: string, start: string, end: string): EventItem {
  return { id, title: `Événement ${id}`, date, start, end, category: 'travail', repeat: 'jamais', createdAt: 1 };
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings, prenom: 'Camille' },
    hydrated: true,
  });
  useUiStore.setState({ toasts: [], eventDialog: { open: false } });
});

describe('Dialogue événement — Radar (M-12) « Suggérer un créneau »', () => {
  it('bouton discret présent ; au clic, jusqu’à 3 pastilles « … — libre » apparaissent', () => {
    useStore.setState({ events: [ev('e1', FUT, '10:00', '11:00')] });
    useUiStore.setState({ eventDialog: { open: true, date: FUT, start: '14:00' } });
    render(<EventDialog />);

    const bouton = screen.getByRole('button', { name: /suggérer un créneau/i });
    expect(bouton).toBeInTheDocument();
    expect(screen.queryAllByTestId('radar-suggestion')).toHaveLength(0); // rien avant le geste

    fireEvent.click(bouton);
    const pills = screen.getAllByTestId('radar-suggestion');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.length).toBeLessThanOrEqual(3);
    for (const pill of pills) expect(pill.textContent).toContain('— libre');
    // aucun chevauchement avec l’événement existant 10h00–11h00
    for (const pill of pills) {
      const m = pill.textContent?.match(/(\d{2}h\d{2}) – (\d{2}h\d{2})/);
      expect(m).not.toBeNull();
    }
  });

  it('un clic sur une pastille remplit le formulaire (date/début/fin) — aucune création automatique', () => {
    useStore.setState({ events: [ev('e1', FUT, '10:00', '11:00')] });
    useUiStore.setState({ eventDialog: { open: true, date: FUT, start: '14:00' } });
    render(<EventDialog />);

    fireEvent.click(screen.getByRole('button', { name: /suggérer un créneau/i }));
    const pills = screen.getAllByTestId('radar-suggestion');
    fireEvent.click(pills[0]);

    const debut = screen.getByLabelText(/^début$/i) as HTMLInputElement;
    const fin = screen.getByLabelText(/^fin$/i) as HTMLInputElement;
    const date = screen.getByLabelText(/^date$/i) as HTMLInputElement;
    expect(debut.value).toMatch(/^\d{2}:\d{2}$/);
    expect(fin.value).toMatch(/^\d{2}:\d{2}$/);
    expect(date.value).toBe(FUT);
    // le créneau choisi ne chevauche pas l’événement existant
    expect(debut.value === '10:00' && fin.value === '11:00').toBe(false);

    // toujours aucun événement créé automatiquement
    expect(useStore.getState().events).toHaveLength(1);

    // la création n’a lieu qu’au submit, avec les valeurs de la pastille
    fireEvent.change(screen.getByLabelText(/^titre$/i), { target: { value: 'Réunion radar' } });
    fireEvent.click(screen.getByRole('button', { name: /créer l’événement/i }));
    const events = useStore.getState().events;
    expect(events).toHaveLength(2);
    const created = events.find((e) => e.title === 'Réunion radar');
    expect(created).toBeDefined();
    expect(created?.date).toBe(FUT);
    expect(created?.start).toBe(debut.value);
    expect(created?.end).toBe(fin.value);
  });

  it('déclenchement automatique et doux quand un chevauchement est détecté (sans clic)', async () => {
    useStore.setState({ events: [ev('e1', FUT, '10:00', '11:00')] });
    // on ouvre le dialogue directement sur un créneau qui chevauche (10h30–11h30 vs 10h00–11h00)
    useUiStore.setState({ eventDialog: { open: true, date: FUT, start: '10:30' } });
    render(<EventDialog />);

    const pills = await screen.findAllByTestId('radar-suggestion');
    expect(pills.length).toBeGreaterThan(0);
    // le message de chevauchement est toujours affiché
    expect(screen.getByText(/chevauchement/i)).toBeInTheDocument();
    // et aucune pastille ne propose le créneau occupé
    for (const pill of pills) expect(pill.textContent).not.toContain('10h00 – 11h00');
  });

  it('journée pleine : les pastilles proposent le jour suivant le plus dégagé', async () => {
    useStore.setState({
      events: [
        ev('a', FUT, '08:00', '12:00'),
        ev('b', FUT, '12:00', '18:00'),
        ev('c', FUT, '18:00', '22:00'),
      ],
    });
    useUiStore.setState({ eventDialog: { open: true, date: FUT, start: '09:00' } });
    render(<EventDialog />);

    fireEvent.click(screen.getByRole('button', { name: /suggérer un créneau/i }));
    const pills = await screen.findAllByTestId('radar-suggestion');
    expect(pills.length).toBeGreaterThan(0);
    // repli sur le lendemain (2026-12-02), pas sur la journée pleine
    for (const pill of pills) expect(pill.textContent).toContain('2 déc.');
    fireEvent.click(pills[0]);
    expect((screen.getByLabelText(/^date$/i) as HTMLInputElement).value).toBe('2026-12-02');
  });
});
