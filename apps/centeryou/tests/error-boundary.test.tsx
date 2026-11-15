import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/error/error-boundary';
import { ErrorScreen } from '../src/components/error/error-screen';
import ErrorRoute from '../src/app/error';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('boom simulé');
  return <p>vue ok</p>;
}

describe('écran d’erreur (jamais de page blanche)', () => {
  it('ErrorScreen : texte français apaisé + bouton « Recharger » qui appelle onReload', () => {
    const onReload = vi.fn();
    render(<ErrorScreen onReload={onReload} onRetry={vi.fn()} />);
    expect(screen.getByText('Oups… une petite panne')).toBeInTheDocument();
    expect(screen.getByText(/tes données restent en sécurité/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /recharger/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('ErrorBoundary : une vue qui plante affiche l’écran d’erreur au lieu de tout casser', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Oups… une petite panne')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recharger/i })).toBeInTheDocument();
    expect(screen.queryByText('vue ok')).not.toBeInTheDocument();
  });

  it('ErrorBoundary : « Réessayer » restaure la vue quand le problème est parti', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Oups… une petite panne')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(screen.getByText('vue ok')).toBeInTheDocument();
  });

  it('ErrorBoundary : une vue saine rend normalement ses enfants', () => {
    render(
      <ErrorBoundary>
        <p>contenu normal</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenu normal')).toBeInTheDocument();
  });

  it('error.tsx (route Next.js) : écran français avec « Recharger » et « Réessayer »', () => {
    const reset = vi.fn();
    render(<ErrorRoute error={new Error('test') as Error & { digest?: string }} reset={reset} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /recharger/i })).toBeInTheDocument();
  });
});
