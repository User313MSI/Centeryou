import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EventBlock } from '../src/components/events/event-block';
import type { CalendarInstance } from '../src/lib/events';
import { useUiStore } from '../src/lib/ui-store';

/**
 * M-08 — règles des hooks React dans EventBlock : les retours précoces (« return null »
 * quand le bloc est hors de la grille affichée) doivent être placés APRÈS tous les hooks,
 * sinon un bloc qui passe de visible à masqué fait lever « Rendered fewer hooks than
 * expected » par React (crash jusqu'à l'ErrorBoundary).
 */

const noop = () => {};

function makeInstance(): CalendarInstance {
  const event = {
    id: 'e1',
    title: 'Sport',
    date: '2026-11-20',
    start: '14:00',
    end: '15:00',
    category: 'perso' as const,
    repeat: 'jamais' as const,
    createdAt: 1, // ancien : pas de célébration à l'apparition
  };
  return {
    kind: 'event',
    id: 'e1',
    title: 'Sport',
    category: 'perso',
    date: '2026-11-20',
    start: '14:00',
    end: '15:00',
    done: false,
    event,
  };
}

function block(dayStartMin: number) {
  return (
    <EventBlock
      instance={makeInstance()}
      pxPerMin={1}
      dayStartMin={dayStartMin}
      onEventClick={noop}
      onTaskToggle={noop}
      onDropAt={noop}
    />
  );
}

describe('EventBlock — retours précoces après tous les hooks (M-08)', () => {
  it('un bloc masqué puis réaffiché ne lève plus aucune erreur React « fewer hooks »', () => {
    const { container, rerender } = render(block(8 * 60));
    expect(container.querySelector('[role="button"]')).toBeTruthy();
    expect(container.textContent).toContain('Sport');

    // grille réglée à 20h : le bloc 14h–15h est entièrement hors grille → masqué (return null)
    rerender(block(20 * 60));
    expect(container.querySelector('[role="button"]')).toBeNull();

    // retour à la grille de 8h : le bloc réapparaît — même nombre de hooks exécuté à chaque rendu
    rerender(block(8 * 60));
    expect(container.querySelector('[role="button"]')).toBeTruthy();
    expect(container.textContent).toContain('Sport');
  });

  it('plusieurs allers-retours visible/masqué restent stables, même avec une mise à jour du store entre-temps', () => {
    const { container, rerender } = render(block(8 * 60));
    for (let i = 0; i < 3; i += 1) {
      rerender(block(20 * 60));
      expect(container.querySelector('[role="button"]')).toBeNull();
      // mise à jour du store UI pendant que le bloc est masqué (ex. sortie douce demandée)
      useUiStore.setState({ exitingIds: ['event:e1'] });
      rerender(block(8 * 60));
      expect(container.querySelector('[role="button"]')).toBeTruthy();
      useUiStore.setState({ exitingIds: [] });
    }
  });
});
