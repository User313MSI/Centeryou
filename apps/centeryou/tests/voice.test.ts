import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
});

describe('service vocal — résilience (aucun crash, aucune erreur bloquante)', () => {
  it('sans speechSynthesis (jsdom) : speak() se résout quand même', async () => {
    const { speak, isSynthesisAvailable } = await import('../src/lib/voice');
    expect(isSynthesisAvailable()).toBe(false);
    await expect(speak('Bonjour')).resolves.toBeUndefined();
  });

  it('texte vide : speak() ne fait rien', async () => {
    const { speak } = await import('../src/lib/voice');
    await expect(speak('   ')).resolves.toBeUndefined();
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

  it('ElevenLabs en échec -> bascule automatique sur le moteur par défaut, toujours résolu', async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY = 'cle-de-test';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau coupé')));
    vi.resetModules();
    const { speak, usesElevenLabs } = await import('../src/lib/voice');
    expect(usesElevenLabs()).toBe(true);
    await expect(speak('Test de repli')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('api.elevenlabs.io'), expect.anything());
  });

  it('ElevenLabs HTTP en erreur -> bascule aussi (pas d’exception)', async () => {
    process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY = 'cle-de-test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    vi.resetModules();
    const { speak } = await import('../src/lib/voice');
    await expect(speak('Test 401')).resolves.toBeUndefined();
  });
});
