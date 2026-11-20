import { beforeEach, describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/aujourdhui',
}));

import { AppShell } from '../src/components/layout/app-shell';

import { DayView } from '../src/components/events/day-view';

import { StatsView } from '../src/components/stats/stats-view';

import { TaskItemRow } from '../src/components/tasks/task-item';

import { defaultSettings } from '../src/lib/defaults';

import { todayISO } from '../src/lib/dates';

import { useStore } from '../src/lib/store';

import { EXIT_ANIMATION_MS, useUiStore } from '../src/lib/ui-store';

import type { EventItem, TaskItem } from '../src/types';

const TODAY = todayISO();
const noop = () => {};

/** Harnais réel : liste de tâches câblée sur le store, comme les pages Aujourd’hui / Tâches. */
function TaskListHarness() {
  const tasks = useStore((s) => s.tasks);
  return (
    <ul>
      {tasks.map((t) => (
        <TaskItemRow key={t.id} task={t} />
      ))}
    </ul>
  );
}


function freshEvent(): EventItem {
  return { id: 'e-new', title: 'Réunion équipe', date: TODAY, start: '14:00', end: '15:00', category: 'travail', repeat: 'jamais', createdAt: Date.now() };
}

function taskToday(over: Partial<TaskItem> = {}): TaskItem {
  return { id: 't-1', title: 'Rapport', date: TODAY, time: null, category: 'travail', priority: 'haute', done: false, createdAt: 1, ...over };
}

/** Harnais réel : DayView câblé sur le store, comme la page Planning. */
function DayHarness() {
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const dayStart = useStore((s) => s.settings.dayStart);
  const toggleTask = useStore((s) => s.toggleTask);
  return (
    <DayView
      date={TODAY}
      events={events}
      tasks={tasks}
      dayStart={dayStart}
      onSlotClick={noop}
      onEventClick={noop}
      onTaskToggle={(t) => toggleTask(t.id)}
      onDropAt={noop}
    />
  );
}

function mockReducedMotion(matches: boolean) {
  return vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => ({
    matches: matches && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia);
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings, onboarded: true, welcomeSequence: 'off' }, hydrated: true });
  useUiStore.setState({ toasts: [], exitingIds: [] });
});

describe('Parcours — création d’un événement (planning)', () => {
  it('animations actives : apparition élastique + halo + onde violette depuis le bloc', async () => {
    useStore.setState({ events: [freshEvent()], settings: { ...defaultSettings, animations: true } });
    const { container } = render(<DayHarness />);
    expect(container.querySelector('.animate-event-celebrate')).toBeTruthy();
    expect(container.querySelector('.celebrate-halo.animate-halo')).toBeTruthy();
    await waitFor(() => expect(document.querySelector('.celebrate-ripple')).toBeTruthy());
    document.querySelectorAll('.celebrate-ripple').forEach((e) => e.remove());
  });

  it('prefers-reduced-motion émulé : aucune onde JS, classes tuées par le CSS global', () => {
    const spy = mockReducedMotion(true);
    useStore.setState({ events: [freshEvent()], settings: { ...defaultSettings, animations: true } });
    const { container } = render(<DayHarness />);
    expect(container.querySelector('.animate-event-celebrate')).toBeTruthy(); // classe posée…
    expect(document.querySelector('.celebrate-ripple')).toBeNull(); // …mais aucun effet JS (statique via le bloc prefers-reduced-motion)
    spy.mockRestore();
  });

  it('réglage désactivé : aucune onde non plus', () => {
    useStore.setState({ events: [freshEvent()], settings: { ...defaultSettings, animations: false } });
    const { container } = render(<DayHarness />);
    expect(container.querySelector('.animate-event-celebrate')).toBeTruthy();
    expect(document.querySelector('.celebrate-ripple')).toBeNull();
  });
});

describe('Parcours — coche d’une tâche', () => {
  it('ligne de tâche : micro-confettis DANS la ligne + vibration courte', async () => {
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      useStore.setState({ tasks: [taskToday()], settings: { ...defaultSettings, animations: true } });
      const { container } = render(<TaskListHarness />);
      fireEvent.click(screen.getByRole('button', { name: /marquer .* comme faite/i }));
      expect(useStore.getState().tasks[0].done).toBe(true);
      await waitFor(() => expect(document.querySelector('.celebrate-confetti')).toBeTruthy());
      const overlay = document.querySelector('.celebrate-confetti')!;
      expect(overlay.parentElement?.tagName).toBe('LI'); // jamais plein écran : contenu dans la ligne
      expect(vibrate).toHaveBeenCalledWith(30);
      container.remove();
    } finally {
      delete (window.navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });

  it('tâche dans le planning : clic sur le bloc -> confettis au niveau du bloc', async () => {
    useStore.setState({ tasks: [taskToday({ time: '14:00' })], settings: { ...defaultSettings, animations: true } });
    const { container } = render(<DayHarness />);
    const bloc = screen.getByRole('button', { name: /tâche rapport/i });
    fireEvent.click(bloc);
    expect(useStore.getState().tasks[0].done).toBe(true);
    await waitFor(() => expect(container.querySelector('.celebrate-confetti')).toBeTruthy()); // contenu dans le bloc (overflow-hidden)
  });

  it('prefers-reduced-motion : coche sans confettis ni vibration', () => {
    const spy = mockReducedMotion(true);
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      useStore.setState({ tasks: [taskToday()], settings: { ...defaultSettings, animations: true } });
      render(<TaskListHarness />);
      fireEvent.click(screen.getByRole('button', { name: /marquer .* comme faite/i }));
      expect(useStore.getState().tasks[0].done).toBe(true);
      expect(document.querySelector('.celebrate-confetti')).toBeNull();
      expect(vibrate).not.toHaveBeenCalled();
    } finally {
      delete (window.navigator as unknown as { vibrate?: unknown }).vibrate;
      spy.mockRestore();
    }
  });

  it('réglage désactivé : coche sans confettis ni vibration', () => {
    const vibrate = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      useStore.setState({ tasks: [taskToday()], settings: { ...defaultSettings, animations: false } });
      render(<TaskListHarness />);
      fireEvent.click(screen.getByRole('button', { name: /marquer .* comme faite/i }));
      expect(document.querySelector('.celebrate-confetti')).toBeNull();
      expect(vibrate).not.toHaveBeenCalled();
    } finally {
      delete (window.navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });
});

describe('Parcours — suppression douce d’une tâche', () => {
  it('clic sur supprimer : sortie animée, tâche encore là, puis suppression réelle après la mini-animation', () => {
    vi.useFakeTimers();
    try {
      useStore.setState({ tasks: [taskToday()], settings: { ...defaultSettings, animations: true } });
      const { container } = render(<TaskListHarness />);
      fireEvent.click(screen.getByRole('button', { name: /supprimer la tâche/i }));
      // pendant la sortie : classe animate-exit, tâche toujours dans le store
      expect(useUiStore.getState().exitingIds).toContain('task:t-1');
      expect(useStore.getState().tasks.some((t) => t.id === 't-1')).toBe(true);
      expect(container.querySelector('.animate-exit')).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(EXIT_ANIMATION_MS + 20);
      });
      expect(useStore.getState().tasks.some((t) => t.id === 't-1')).toBe(false); // suppression réelle ensuite
      expect(useUiStore.getState().exitingIds).not.toContain('task:t-1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('« Annuler » à temps : la sortie est annulée, la tâche reste', () => {
    vi.useFakeTimers();
    try {
      useStore.setState({ tasks: [taskToday()], settings: { ...defaultSettings, animations: true } });
      render(<TaskListHarness />);
      fireEvent.click(screen.getByRole('button', { name: /supprimer la tâche/i }));
      expect(useUiStore.getState().cancelExit('task:t-1')).toBe(true);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useStore.getState().tasks.some((t) => t.id === 't-1')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('réglage désactivé : suppression immédiate (délai 0)', () => {
    vi.useFakeTimers();
    try {
      useStore.setState({ tasks: [taskToday()], settings: { ...defaultSettings, animations: false } });
      render(<TaskListHarness />);
      fireEvent.click(screen.getByRole('button', { name: /supprimer la tâche/i }));
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(useStore.getState().tasks.some((t) => t.id === 't-1')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Parcours — record dans /stats', () => {
  it('nouvelle série record : un petit feu d’artifice discret apparaît, une seule fois', async () => {
    useStore.setState({
      events: [{ id: 'e1', title: 'Sport', date: TODAY, start: '18:00', end: '19:00', category: 'perso', repeat: 'jamais', createdAt: 1 }],
      tasks: [taskToday({ done: true })],
      settings: { ...defaultSettings, animations: true, welcomeSequence: 'off' },
    });
    render(<StatsView />);
    await waitFor(() => expect(document.querySelector('.celebrate-firework')).toBeTruthy());
    document.querySelectorAll('.celebrate-firework').forEach((e) => e.remove());
    // record persisté : plus de feu d’artifice au rechargement
    window.localStorage.setItem('centeryou-record-serie', '1');
    render(<StatsView />);
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('.celebrate-firework')).toBeNull();
  });

  it('réglage désactivé : aucun feu d’artifice', async () => {
    useStore.setState({
      events: [{ id: 'e1', title: 'Sport', date: TODAY, start: '18:00', end: '19:00', category: 'perso', repeat: 'jamais', createdAt: 1 }],
      tasks: [taskToday({ done: true })],
      settings: { ...defaultSettings, animations: false, welcomeSequence: 'off' },
    });
    render(<StatsView />);
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('.celebrate-firework')).toBeNull();
  });
});

describe('Parcours — coquille & transitions de vues', () => {
  it('AppShell : transition de vue (animate-view-in sur <main>) + classe animations-off quand le réglage est désactivé', () => {
    useStore.setState({ settings: { ...defaultSettings, animations: false, onboarded: true, welcomeSequence: 'off' }, hydrated: true });
    const { container, rerender } = render(
      <AppShell>
        <div>page</div>
      </AppShell>,
    );
    expect(document.documentElement.classList.contains('animations-off')).toBe(true);
    expect(container.querySelector('main.animate-view-in')).toBeTruthy();
    // réglage réactivé -> la classe disparaît (tout redevient animé instantanément)
    act(() => {
      useStore.setState({ settings: { ...defaultSettings, animations: true, onboarded: true, welcomeSequence: 'off' } });
    });
    rerender(
      <AppShell>
        <div>page</div>
      </AppShell>,
    );
    expect(document.documentElement.classList.contains('animations-off')).toBe(false);
  });
});
