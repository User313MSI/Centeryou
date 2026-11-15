import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WelcomeSequence } from '../src/components/today/welcome-sequence';
import { defaultSettings } from '../src/lib/defaults';
import { useStore } from '../src/lib/store';
import { todayISO } from '../src/lib/dates';
import { shouldShowWelcome } from '../src/lib/welcome';

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
});

describe('shouldShowWelcome (logique de fréquence)', () => {
  const today = '2025-01-06';
  it('off -> jamais', () => {
    expect(shouldShowWelcome('off', '', today)).toBe(false);
    expect(shouldShowWelcome('off', today, today)).toBe(false);
  });
  it('daily (défaut) -> une fois par jour', () => {
    expect(shouldShowWelcome('daily', '', today)).toBe(true);
    expect(shouldShowWelcome('daily', today, today)).toBe(false);
    expect(shouldShowWelcome('daily', '2025-01-05', today)).toBe(true);
    expect(shouldShowWelcome(undefined, '', today)).toBe(true); // défaut = daily
  });
  it('always -> à chaque ouverture', () => {
    expect(shouldShowWelcome('always', today, today)).toBe(true);
    expect(shouldShowWelcome('always', '', today)).toBe(true);
  });
});

describe('WelcomeSequence (composant)', () => {
  it('mode daily, jamais vue -> la séquence s’ouvre et est marquée vue du jour', async () => {
    render(<WelcomeSequence />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(useStore.getState().settings.welcomeShownDate).toBe(todayISO());
  });

  it('mode daily, déjà vue aujourd’hui -> ne s’ouvre pas', () => {
    useStore.setState({ settings: { ...defaultSettings, welcomeSequence: 'daily', welcomeShownDate: todayISO() } });
    render(<WelcomeSequence />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mode off -> ne s’ouvre pas', () => {
    useStore.setState({ settings: { ...defaultSettings, welcomeSequence: 'off' } });
    render(<WelcomeSequence />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mode always -> s’ouvre même si déjà vue aujourd’hui', async () => {
    useStore.setState({ settings: { ...defaultSettings, welcomeSequence: 'always', welcomeShownDate: todayISO() } });
    render(<WelcomeSequence />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('« Passer » ferme la séquence', async () => {
    render(<WelcomeSequence />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /passer/i }));
    expect(dialog).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('affiche le bouton « Écouter le résumé » (la voix ne démarre jamais seule)', async () => {
    render(<WelcomeSequence />);
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: /écouter le résumé/i })).toBeInTheDocument();
  });
});
