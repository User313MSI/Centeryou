import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/stats',
}));

import { AujourdhuiView } from '../src/components/today/aujourdhui-view';
import { StatsView } from '../src/components/stats/stats-view';
import { defaultSettings } from '../src/lib/defaults';
import { addDaysISO, startOfWeekISO, todayISO } from '../src/lib/dates';
import { useStore } from '../src/lib/store';
import type { EventItem, TaskItem } from '../src/types';

const TODAY = todayISO();
const MONDAY = startOfWeekISO(TODAY);

function ev(partial: Partial<EventItem> & { title: string }): EventItem {
  return {
    id: `e-${partial.title}`,
    date: MONDAY,
    start: '09:00',
    end: '10:00',
    category: 'travail',
    repeat: 'jamais',
    createdAt: 1,
    ...partial,
  };
}
function task(partial: Partial<TaskItem> & { title: string }): TaskItem {
  return {
    id: `t-${partial.title}`,
    date: TODAY,
    time: null,
    category: 'perso',
    priority: 'moyenne',
    done: false,
    createdAt: 1,
    ...partial,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings, welcomeSequence: 'off', briefShownDate: TODAY },
    hydrated: true,
  });
});

describe('StatsView', () => {
  it('état vide : invitation chaleureuse au premier jour', () => {
    render(<StatsView />);
    expect(screen.getByText(/Ajoute ton premier événement pour voir ta semaine prendre forme/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aller à aujourd'hui/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); // aucun graphique sans données
  });

  it('avec données : sections, graphiques SVG inline, badge ± %, insight et série', () => {
    useStore.setState({
      events: [
        ev({ title: 'hebdo', date: addDaysISO(MONDAY, -21), start: '09:00', end: '11:00', repeat: 'semaine', category: 'travail' }),
        ev({ title: 'sport', date: MONDAY, start: '18:00', end: '20:00', repeat: 'jamais', category: 'sante' }),
      ],
      tasks: [task({ title: 't1', date: TODAY, done: true })],
    });
    const { container } = render(<StatsView />);

    // titres des cartes
    expect(screen.getByText('Temps par semaine')).toBeInTheDocument();
    expect(screen.getByText('Un mot sur ta semaine')).toBeInTheDocument();
    expect(screen.getByText('Habitudes')).toBeInTheDocument();

    // 3 graphiques SVG inline accessibles (barres hebdo, jours, donut)
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(3);

    // badge de variation vs semaine précédente : 240 min vs 120 min -> +100 %
    expect(screen.getByText('+100 %')).toBeInTheDocument();

    // insight calculé : lundi le plus chargé, Santé en hausse de 2 h, 100 % de tâches accomplies
    expect(screen.getByText(/Ta journée la plus chargée : lundi/)).toBeInTheDocument();
    expect(screen.getByText(/Santé progresse de 2 h cette semaine/)).toBeInTheDocument();
    expect(screen.getByText(/100 % de tes tâches sont accomplies/)).toBeInTheDocument();

    // taux de complétion 7 et 30 jours + streak
    expect(screen.getByText('Complétion sur 7 jours')).toBeInTheDocument();
    expect(screen.getByText('Complétion sur 30 jours')).toBeInTheDocument();
    expect(screen.getByText('1 jour organisé d’affilée')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });
});

describe('Carte d’entrée « Tes stats » dans Aujourd’hui', () => {
  it('précise le lien vers /stats (pas de nouvel onglet de navigation)', () => {
    useStore.setState({
      events: [ev({ title: 'sport', date: TODAY, start: '18:00', end: '19:00', repeat: 'jamais', category: 'sante' })],
      tasks: [],
    });
    render(<AujourdhuiView />);
    const link = screen.getByRole('link', { name: /voir mes stats/i });
    expect(link).toHaveAttribute('href', '/stats');
    expect(screen.getByText('Ton temps, en clair')).toBeInTheDocument();
    // la semaine en cours affiche ses heures sur la carte (1 h planifiée)
    expect(screen.getByText('1 h cette semaine')).toBeInTheDocument();
  });
});
