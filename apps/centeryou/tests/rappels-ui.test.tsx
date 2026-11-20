import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// le domaine des rappels est importé dynamiquement par le dialogue et les réglages :
// on mock seulement la demande de permission pour l'espionner (logique testée ailleurs)
const requestPerm = vi.hoisted(() => vi.fn(async () => 'granted' as string));
vi.mock('../src/lib/rappels', () => ({ requestRappelPermission: requestPerm }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/reglages',
}));

import ReglagesPage from '../src/app/reglages/page';

import { EventDialog } from '../src/components/events/event-dialog';

import { defaultSettings } from '../src/lib/defaults';

import { useStore } from '../src/lib/store';

import { useUiStore } from '../src/lib/ui-store';

const TODAY = '2026-11-20';

function mockNotification(permission: string) {
  class FakeNotification {
    static permission = permission;
    static requestPermission = async () => permission;
    static maxActions = 2;
  }
  Object.defineProperty(window, 'Notification', { value: FakeNotification, configurable: true, writable: true });
}

function cleanNotification() {
  // jsdom n'a pas Notification : on remet l'état initial
  Object.defineProperty(window, 'Notification', { value: undefined, configurable: true, writable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  requestPerm.mockClear();
  requestPerm.mockImplementation(async () => 'granted');
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings, prenom: 'Camille' },
    hydrated: true,
  });
  useUiStore.setState({ toasts: [], eventDialog: { open: false }, highlightEventId: null, highlightAt: 0 });
  cleanNotification();
});

describe('Dialogue événement — option « Me rappeler »', () => {
  function openDialog(eventId?: string) {
    useUiStore.setState({ eventDialog: { open: true, eventId, date: TODAY, start: '10:00' } });
    return render(<EventDialog />);
  }

  it('nouvel événement : select présent, 6 options, valeur par défaut = réglage (10 min, « (défaut) »)', () => {
    openDialog();
    const select = screen.getByLabelText(/me rappeler/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('10');
    const options = Array.from(select.options).map((o) => o.textContent ?? '');
    expect(options).toEqual(['Sans rappel', '5 min avant', '10 min avant (défaut)', '30 min avant', '1 h avant', '1 jour avant']);
  });

  it('le réglage « moment par défaut » pilote la valeur proposée', () => {
    useStore.setState({ settings: { ...defaultSettings, reminderDefaultMinutes: 1440 } });
    openDialog();
    expect((screen.getByLabelText(/me rappeler/i) as HTMLSelectElement).value).toBe('1440');
  });

  it('créer avec « 30 min avant » : l’événement est stocké AVEC reminderMinutes=30 et la permission est demandée (bon moment)', async () => {
    const { container } = openDialog();
    fireEvent.change(screen.getByLabelText(/^titre$/i), { target: { value: 'Dentiste' } });
    fireEvent.change(screen.getByLabelText(/me rappeler/i), { target: { value: '30' } });
    fireEvent.submit(container.querySelector('form')!);
    const ev = useStore.getState().events[0];
    expect(ev.title).toBe('Dentiste');
    expect(ev.reminderMinutes).toBe(30);
    await waitFor(() => expect(requestPerm).toHaveBeenCalledTimes(1));
  });

  it('créer « Sans rappel » : reminderMinutes null, AUCUNE demande de permission', async () => {
    const { container } = openDialog();
    fireEvent.change(screen.getByLabelText(/^titre$/i), { target: { value: 'Sport' } });
    fireEvent.change(screen.getByLabelText(/me rappeler/i), { target: { value: '' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(useStore.getState().events[0].reminderMinutes).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(requestPerm).not.toHaveBeenCalled();
  });

  it('permission refusée : toast clair en français (réactivation navigateur), événement quand même créé', async () => {
    requestPerm.mockResolvedValueOnce('denied');
    const { container } = openDialog();
    fireEvent.change(screen.getByLabelText(/^titre$/i), { target: { value: 'Réunion' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(useStore.getState().events[0].reminderMinutes).toBe(10);
    await waitFor(() =>
      expect(useUiStore.getState().toasts.some((t) => t.message.includes('bloquées') && t.message.includes('cadenas'))).toBe(true),
    );
  });

  it('édition : le select reflète le rappel existant (null -> « Sans rappel », 60 -> « 1 h avant »)', () => {
    useStore.setState({
      events: [
        { id: 'e1', title: 'A', date: TODAY, start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais', createdAt: 1, reminderMinutes: null },
        { id: 'e2', title: 'B', date: TODAY, start: '12:00', end: '13:00', category: 'autre', repeat: 'jamais', createdAt: 2, reminderMinutes: 60 },
      ],
    });
    openDialog('e1');
    expect((screen.getByLabelText(/me rappeler/i) as HTMLSelectElement).value).toBe('');
  });

  it('modifier le rappel d’un événement existant : updateEvent reçoit reminderMinutes', () => {
    useStore.setState({
      events: [{ id: 'e2', title: 'B', date: TODAY, start: '12:00', end: '13:00', category: 'autre', repeat: 'jamais', createdAt: 2, reminderMinutes: 60 }],
    });
    const { container } = openDialog('e2');
    expect((screen.getByLabelText(/me rappeler/i) as HTMLSelectElement).value).toBe('60');
    fireEvent.change(screen.getByLabelText(/me rappeler/i), { target: { value: '5' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(useStore.getState().events[0].reminderMinutes).toBe(5);
  });
});

describe('Réglages — carte « Rappels »', () => {
  it('carte complète en français : bascules, select des délais, heure des tâches, périmètre honnête', () => {
    mockNotification('granted');
    render(<ReglagesPage />);
    expect(screen.getByRole('heading', { name: /rappels/i })).toBeInTheDocument();
    expect(screen.getByText(/ouvert ou en arrière-plan/i)).toBeInTheDocument();
    expect(screen.getByText(/pas quand l’application est complètement fermée/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /tous les rappels/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/rappel par défaut des nouveaux événements/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /rappel des tâches du jour/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/heure du rappel des tâches/i)).toBeInTheDocument();
    // permission accordée : message positif, pas de bouton
    expect(screen.getByText(/notifications autorisées/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activer les rappels/i })).not.toBeInTheDocument();
  });

  it('permission non accordée : bouton « Activer les rappels » -> demande (geste utilisateur)', async () => {
    mockNotification('default');
    render(<ReglagesPage />);
    const btn = screen.getByRole('button', { name: /activer les rappels/i });
    fireEvent.click(btn);
    await waitFor(() => expect(requestPerm).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.some((t) => t.message.includes('autorisées'))).toBe(true),
    );
  });

  it('permission refusée : explication en français simple (cadenas, réglages du site, Safari), aucun jargon', () => {
    mockNotification('denied');
    render(<ReglagesPage />);
    expect(screen.getByText(/notifications bloquées par ton navigateur/i)).toBeInTheDocument();
    expect(screen.getByText(/cadenas/i)).toBeInTheDocument();
    expect(screen.getByText(/Safari/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activer les rappels/i })).not.toBeInTheDocument();
  });

  it('navigateur sans Notification API : message honnête « aucun rappel ne sera envoyé »', () => {
    cleanNotification();
    render(<ReglagesPage />);
    expect(screen.getByText(/ce navigateur ne permet pas les notifications/i)).toBeInTheDocument();
  });

  it('les réglages sont persistés via le store : bascules, délai par défaut, heure des tâches', () => {
    mockNotification('granted');
    render(<ReglagesPage />);
    fireEvent.click(screen.getByRole('switch', { name: /tous les rappels/i }));
    expect(useStore.getState().settings.reminders).toBe(false);
    fireEvent.change(screen.getByLabelText(/rappel par défaut des nouveaux événements/i), { target: { value: '1440' } });
    expect(useStore.getState().settings.reminderDefaultMinutes).toBe(1440);
    fireEvent.click(screen.getByRole('switch', { name: /rappel des tâches du jour/i }));
    expect(useStore.getState().settings.tasksReminder).toBe(false);
    const heure = screen.getByLabelText(/heure du rappel des tâches/i) as HTMLInputElement;
    expect(heure.disabled).toBe(true); // désactivé quand le rappel tâches est coupé
    fireEvent.click(screen.getByRole('switch', { name: /rappel des tâches du jour/i }));
    fireEvent.change(screen.getByLabelText(/heure du rappel des tâches/i), { target: { value: '18:30' } });
    expect(useStore.getState().settings.tasksReminderTime).toBe('18:30');
  });
});
