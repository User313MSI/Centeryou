import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../src/lib/defaults';
import { useStore } from '../src/lib/store';
import { useUiStore } from '../src/lib/ui-store';

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings, prenom: '' }, hydrated: true });
  useUiStore.setState({ toasts: [] });
  vi.unstubAllGlobals();
});

describe('service vocal client — résilience (jamais d’erreur bloquante)', () => {
  it('sans speechSynthesis (jsdom) : speak() se résout quand même', async () => {
    const { speak, isSynthesisAvailable } = await import('../src/lib/voice');
    expect(isSynthesisAvailable()).toBe(false);
    await expect(speak('Bonjour')).resolves.toBeUndefined();
  });

  it('texte vide : speak() ne fait rien, aucun appel réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { speak } = await import('../src/lib/voice');
    await expect(speak('   ')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('anonyme (pas de prénom) : voix premium non appelée, bascule directe sur la voix du navigateur', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { speak } = await import('../src/lib/voice');
    await expect(speak('Bonjour')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled(); // /api/voix réservée aux profils renseignés
  });

  it('profil renseigné : appelle POST /api/voix avec l’en-tête x-centeryou-user', async () => {
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille' } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);
    const { speak } = await import('../src/lib/voice');
    await expect(speak('Bonjour Camille')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/voix');
    expect((init.headers as Record<string, string>)['x-centeryou-user']).toBe('Camille');
  });

  it('quota atteint (429) : toast clair + bascule douce sur la voix du navigateur, toujours résolu', async () => {
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille' } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Quota de voix premium atteint pour aujourd’hui.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { speak } = await import('../src/lib/voice');
    await expect(speak('Encore du texte')).resolves.toBeUndefined();
    expect(useUiStore.getState().toasts.some((t) => t.message.includes('Quota'))).toBe(true);
  });

  it('route injoignable (réseau coupé) : bascule douce, speak() résolu', async () => {
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille' } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau coupé')));
    const { speak } = await import('../src/lib/voice');
    await expect(speak('Test repli')).resolves.toBeUndefined();
  });

  it('succès premium (200 audio) : lecture du buffer puis fin propre', async () => {
    useStore.setState({ settings: { ...defaultSettings, prenom: 'Camille' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play(this: HTMLMediaElement) {
      setTimeout(() => this.onended?.(new Event('ended')), 0);
      return Promise.resolve();
    });
    const { speak } = await import('../src/lib/voice');
    await expect(speak('Lecture premium')).resolves.toBeUndefined();
  });

  it('stopSpeaking et playBlip ne plantent jamais sans API navigateur', async () => {
    const { stopSpeaking, playBlip } = await import('../src/lib/voice');
    expect(() => stopSpeaking()).not.toThrow();
    expect(() => playBlip(880)).not.toThrow();
  });

  it('startListening renvoie null quand la reconnaissance est indisponible', async () => {
    const { startListening, isRecognitionAvailable } = await import('../src/lib/voice');
    expect(isRecognitionAvailable()).toBe(false);
    expect(startListening(() => {})).toBeNull();
  });
});
