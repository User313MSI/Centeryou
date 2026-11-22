import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultSettings } from '../src/lib/defaults';

import { sanitizeSettings } from '../src/lib/sanitize';

import {
  ACCORDS_NAPPE,
  CLE_GESTE_SONS,
  CRETE_NOTE,
  MAX_SONS_SIMULTANES,
  PLANS,
  VOLUME_DEFAUT_SONS,
  audioDebloque,
  dureePlan,
  jouerPlan,
  jouerSon,
  marquerGesteAudio,
  nappeActive,
  nappeVoulue,
  playCarillon,
  playDing,
  playPop,
  playRecord,
  reinitialiserSons,
  sonsActifsFrom,
  startNappe,
  stopNappe,
  stopNappe as arreterNappe,
  volumeFrom,
  type ContexteLike,
  type NomSon,
} from '../src/lib/sons';

import { useStore } from '../src/lib/store';

import type { Settings } from '../src/types';

/* ---------------------------------------------------------------- *
 *  Faux contexte Web Audio (structure identique à ContexteLike)
 * ---------------------------------------------------------------- */

function fauxContexte(state = 'running') {
  const oscs: Array<{
    type: string;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }> = [];
  const gains: Array<{
    gain: {
      value: number;
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      cancelScheduledValues: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  }> = [];
  const ctx = {
    currentTime: 0,
    state,
    destination: {},
    resume: vi.fn(),
    createOscillator: () => {
      const o = {
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as (() => void) | null,
      };
      oscs.push(o);
      return o;
    },
    createGain: () => {
      const g = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn((v: number) => {
            g.gain.value = v;
          }),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn((v: number) => {
            g.gain.value = v;
          }),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
      };
      gains.push(g);
      return g;
    },
  };
  return { ctx: ctx as unknown as ContexteLike, oscs, gains, resume: ctx.resume };
}

function reglage(over: Partial<Settings> = {}): Settings {
  return { ...defaultSettings, ...over };
}

/** deps de test fully injectés : aucun accès au store ni au vrai AudioContext */
function depsPour(opts: { settings?: Settings; state?: string; debloque?: boolean } = {}) {
  const f = fauxContexte(opts.state ?? 'running');
  const deps = {
    getSettings: () => opts.settings ?? reglage(),
    getCtx: () => f.ctx,
    estDebloque: () => opts.debloque ?? true,
  };
  return { deps, ...f };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  reinitialiserSons();
  useStore.setState({ settings: { ...defaultSettings }, hydrated: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

/* ---------------------------------------------------------------- *
 *  Réglages : défauts, sanitation, migrations intactes
 * ---------------------------------------------------------------- */

describe('Diapason — réglages persistés (sanitizeSettings)', () => {
  it('défauts : sons actifs, volume par défaut 0,6 (audible mais doux — M-20), nappe du film OFF', () => {
    const s = sanitizeSettings(undefined);
    expect(s.sounds).toBe(true);
    expect(s.soundVolume).toBe(VOLUME_DEFAUT_SONS);
    expect(VOLUME_DEFAUT_SONS).toBe(0.6); // M-20 : assez fort pour être entendu (avant 0,35 × crête 0,22 = murmure)
    expect(VOLUME_DEFAUT_SONS).toBeLessThanOrEqual(0.7); // jamais criard
    expect(CRETE_NOTE).toBe(0.35); // crête par note (avant 0,22)
    expect(s.filmPad).toBe(false); // la nappe ne s'impose jamais
  });

  it('soundVolume est borné 0–1, filmPad est booléen strict (données corrompues réparées)', () => {
    expect(sanitizeSettings({ soundVolume: 9, filmPad: 'oui' } as unknown as Settings).soundVolume).toBe(1);
    expect(sanitizeSettings({ soundVolume: -3, filmPad: 1 } as unknown as Settings).soundVolume).toBe(0);
    expect(sanitizeSettings({ soundVolume: 'fort' } as unknown as Settings).soundVolume).toBe(VOLUME_DEFAUT_SONS);
    expect(sanitizeSettings({ soundVolume: NaN } as unknown as Settings).soundVolume).toBe(VOLUME_DEFAUT_SONS);
    expect(sanitizeSettings({ filmPad: 'oui' } as unknown as Settings).filmPad).toBe(false);
    expect(sanitizeSettings({ filmPad: true }).filmPad).toBe(true);
    // les autres champs existants ne bougent pas (migrations v1→v2 intactes)
    const s = sanitizeSettings({ prenom: 'Léa', sounds: false } as unknown as Settings);
    expect(s.prenom).toBe('Léa');
    expect(s.sounds).toBe(false);
    expect(s.launchFilm).toBe('daily');
    expect(s.animations).toBe(true);
  });

  it('defaultSettings expose les nouveaux champs', () => {
    expect(defaultSettings.soundVolume).toBe(VOLUME_DEFAUT_SONS);
    expect(defaultSettings.filmPad).toBe(false);
  });
});

/* ---------------------------------------------------------------- *
 *  Helpers purs
 * ---------------------------------------------------------------- */

describe('Diapason — helpers purs', () => {
  it('sonsActifsFrom / volumeFrom / nappeVoulue', () => {
    expect(sonsActifsFrom({ sounds: true })).toBe(true);
    expect(sonsActifsFrom({ sounds: false })).toBe(false);
    expect(sonsActifsFrom(undefined)).toBe(true);
    expect(volumeFrom({ soundVolume: 0.8 })).toBe(0.8);
    expect(volumeFrom({ soundVolume: 42 })).toBe(1);
    expect(volumeFrom({ soundVolume: -1 })).toBe(0);
    expect(volumeFrom(undefined)).toBe(VOLUME_DEFAUT_SONS);
    // nappe : OFF par défaut, seulement si sons actifs ET filmPad activé
    expect(nappeVoulue(reglage())).toBe(false);
    expect(nappeVoulue(reglage({ filmPad: true }))).toBe(true);
    expect(nappeVoulue(reglage({ filmPad: true, sounds: false }))).toBe(false);
  });

  it('plans : « ding » = 2 notes douces, carillon = 3 notes, tout court et dans des fréquences agréables', () => {
    const noms: NomSon[] = ['ding', 'pop', 'carillon', 'record'];
    for (const n of noms) {
      const plan = PLANS[n];
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan.length).toBeLessThanOrEqual(3);
      for (const note of plan) {
        expect(note.f).toBeGreaterThanOrEqual(150);
        expect(note.f).toBeLessThanOrEqual(1200); // jamais criard
        expect(dureePlan(plan)).toBeLessThan(1.6); // sons courts
      }
    }
    expect(PLANS.ding).toHaveLength(2); // « 2 notes douces »
    expect(PLANS.carillon).toHaveLength(3);
    // la nappe : 2-3 accords de 3 notes
    expect(ACCORDS_NAPPE.length).toBeGreaterThanOrEqual(2);
    expect(ACCORDS_NAPPE.length).toBeLessThanOrEqual(4);
    for (const accord of ACCORDS_NAPPE) expect(accord).toHaveLength(3);
  });
});

/* ---------------------------------------------------------------- *
 *  Déverrouillage audio : JAMAIS de son sans geste dans la session
 * ---------------------------------------------------------------- */

describe('Diapason — déverrouillage audio (politique navigateur)', () => {
  it('aucun geste dans l’onglet -> audioDebloque() faux, tampon sessionStorage vide', () => {
    expect(audioDebloque()).toBe(false);
    expect(window.sessionStorage.getItem(CLE_GESTE_SONS)).toBeNull();
  });

  it('marquerGesteAudio() débloque et tamponne en sessionStorage', () => {
    marquerGesteAudio();
    expect(audioDebloque()).toBe(true);
    expect(window.sessionStorage.getItem(CLE_GESTE_SONS)).toBe('1');
  });

  it('un vrai geste (pointerdown) dans l’onglet débloque l’audio via les écouteurs posés à l’import', () => {
    expect(audioDebloque()).toBe(false);
    window.dispatchEvent(new Event('pointerdown'));
    expect(audioDebloque()).toBe(true);
  });

  it('sans geste, playDing() ne joue RIEN et ne crée même pas de AudioContext', () => {
    const ctor = vi.fn(function (this: unknown) {
      return fauxContexte().ctx;
    });
    (window as unknown as { AudioContext: unknown }).AudioContext = ctor;
    useStore.setState({ settings: reglage({ sounds: true }) });
    expect(playDing()).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('après un geste, playDing() joue via un AudioContext partagé (singleton)', () => {
    const f = fauxContexte();
    const ctor = vi.fn(function (this: unknown) {
      return f.ctx;
    });
    (window as unknown as { AudioContext: unknown }).AudioContext = ctor;
    useStore.setState({ settings: reglage({ sounds: true }) });
    marquerGesteAudio();
    expect(playDing()).toBe(true);
    expect(playPop()).toBe(true);
    expect(ctor).toHaveBeenCalledTimes(1); // contexte partagé, pas un par son
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });
});

/* ---------------------------------------------------------------- *
 *  Moteur : gardes + orchestration
 * ---------------------------------------------------------------- */

describe('Diapason — jouerSon (gardes)', () => {
  it('joue « ding » : 2 oscillateurs aux fréquences du plan, gain maître = volume', () => {
    const { deps, ctx, oscs, gains } = depsPour({ settings: reglage({ sounds: true, soundVolume: 0.5 }) });
    expect(jouerSon('ding', deps)).toBe(true);
    expect(oscs).toHaveLength(2);
    expect(oscs[0].frequency.value).toBe(PLANS.ding[0].f);
    expect(oscs[1].frequency.value).toBe(PLANS.ding[1].f);
    expect(oscs[0].start).toHaveBeenCalled();
    expect(gains[0].gain.value).toBe(0.5); // master = volume
    expect(ctx.destination).toBeTruthy();
  });

  it('réglage « sons » coupé -> false, aucun contexte touché', () => {
    const { deps, oscs } = depsPour({ settings: reglage({ sounds: false }) });
    expect(jouerSon('ding', deps)).toBe(false);
    expect(jouerSon('pop', deps)).toBe(false);
    expect(oscs).toHaveLength(0);
  });

  it('pas de geste -> false, aucun oscillateur créé', () => {
    const { deps, oscs } = depsPour({ settings: reglage(), debloque: false });
    expect(jouerSon('carillon', deps)).toBe(false);
    expect(oscs).toHaveLength(0);
  });

  it('contexte « suspended » (resume() asynchrone pas encore appliqué) -> resume() tenté ET notes programmées : le son partira dès que le contexte tournera (M-20)', () => {
    const { deps, oscs, resume } = depsPour({ settings: reglage(), state: 'suspended' });
    expect(jouerSon('ding', deps)).toBe(true);
    expect(resume).toHaveBeenCalled();
    expect(oscs).toHaveLength(2); // les 2 notes du « ding » sont programmées malgré « suspended »
    expect(oscs[0].start).toHaveBeenCalled();
  });

  it('PREMIER GESTE de la session : rien avant le geste, puis le 1er appel (contexte encore « suspended ») produit bien un son — pas seulement le 2e (M-20)', () => {
    const f = fauxContexte('suspended');
    let debloque = false;
    const deps = {
      getSettings: () => reglage(),
      getCtx: () => f.ctx,
      estDebloque: () => debloque,
    };
    // session fraîche, aucun geste dans l'onglet : aucun son, aucun oscillateur
    expect(jouerSon('ding', deps)).toBe(false);
    expect(f.oscs).toHaveLength(0);
    // le tout premier geste arrive (pointerdown -> marquerGesteAudio) : le contexte existe mais
    // resume() n'a pas encore fait passer l'état à « running » — le piège de l'ancien code
    debloque = true;
    expect(jouerSon('ding', deps)).toBe(true); // le 1er son de la session est bien programmé
    expect(f.resume).toHaveBeenCalled();
    expect(f.oscs).toHaveLength(2);
    expect(f.oscs[0].start).toHaveBeenCalled(); // il sonnera dès que le contexte tournera
    f.ctx.state = 'running'; // le navigateur a appliqué le resume()
    expect(f.oscs[1].stop).toHaveBeenCalled(); // les oscillateurs étaient bien lancés
    // et le 2e son part immédiatement (contexte running)
    expect(jouerSon('pop', deps)).toBe(true);
    expect(f.oscs).toHaveLength(4);
  });

  it('Web Audio indisponible (pas de AudioContext) -> false, sans crash', () => {
    const deps = {
      getSettings: () => reglage(),
      getCtx: () => null,
      estDebloque: () => true,
    };
    expect(jouerSon('ding', deps)).toBe(false);
  });

  it('JAMAIS plus de 2 sons à la fois : le 3e est refusé, puis le créneau se libère (onended)', () => {
    const { deps, oscs } = depsPour({ settings: reglage() });
    expect(MAX_SONS_SIMULTANES).toBe(2);
    expect(jouerSon('ding', deps)).toBe(true);
    expect(jouerSon('pop', deps)).toBe(true);
    expect(jouerSon('carillon', deps)).toBe(false); // 3e refusé
    expect(oscs).toHaveLength(4); // 2 + 2 notes, pas de 3e son
    // fin du 1er son (dernier osc du plan « ding ») -> créneau libéré
    oscs[1].onended?.();
    expect(jouerSon('carillon', deps)).toBe(true);
  });

  it('les lecteurs nommés déléguent au moteur', () => {
    const { deps } = depsPour({ settings: reglage() });
    expect(playDing(deps)).toBe(true);
    expect(playPop(deps)).toBe(true);
    expect(playCarillon(deps)).toBe(false); // 3e simultané refusé
    expect(playRecord(deps)).toBe(false);
  });

  it('sans deps, le moteur lit les réglages du store', () => {
    useStore.setState({ settings: reglage({ sounds: false }) });
    expect(jouerSon('ding', { estDebloque: () => true, getCtx: () => fauxContexte().ctx })).toBe(false);
    useStore.setState({ settings: reglage({ sounds: true }) });
    expect(jouerSon('ding', { estDebloque: () => true, getCtx: () => fauxContexte().ctx })).toBe(true);
  });
});

describe('Diapason — jouerPlan (orchestration pure)', () => {
  it('chaque note = 1 oscillateur + 1 gain en enveloppe, reliés au master', () => {
    const { ctx, oscs, gains } = fauxContexte();
    const { duree, dernier } = jouerPlan(ctx, PLANS.carillon, 0.35, 1.0);
    expect(oscs).toHaveLength(3);
    expect(gains.length).toBe(4); // 3 notes + 1 master
    expect(gains[0].gain.value).toBe(0.35); // master
    for (let i = 1; i < gains.length; i += 1) {
      expect(gains[i].gain.setValueAtTime).toHaveBeenCalled();
      expect(gains[i].gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    }
    expect(duree).toBeCloseTo(dureePlan(PLANS.carillon), 5);
    expect(dernier).toBe(oscs[2]);
    // attaques à t0 + n.t
    expect(oscs[0].start).toHaveBeenCalledWith(1.0);
    expect(oscs[2].start).toHaveBeenCalledWith(1.0 + PLANS.carillon[2].t);
  });

  it('crête par note = CRETE_NOTE (0,35) sous le gain maître = volume : amplitude effective ~0,21 avec le défaut 0,6 — audible, jamais criarde (M-20)', () => {
    const { ctx, gains } = fauxContexte();
    jouerPlan(ctx, PLANS.ding, 0.6, 0);
    expect(gains[0].gain.value).toBe(0.6); // gain maître = volume
    // 1re note (g = 1) : rampe vers la crête CRETE_NOTE
    expect(gains[1].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(CRETE_NOTE, expect.any(Number));
    // 2e note (g = 0,8) : crête 0,28
    expect(gains[2].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(CRETE_NOTE * 0.8, expect.any(Number));
    // amplitude effective max = volume × crête = 0,6 × 0,35 = 0,21 (avant M-20 : 0,35 × 0,22 = 0,077, inaudible)
    expect(0.6 * CRETE_NOTE).toBeLessThanOrEqual(0.25);
  });
});

/* ---------------------------------------------------------------- *
 *  Nappe du film (OFF par défaut)
 * ---------------------------------------------------------------- */

describe('Diapason — nappe du film', () => {
  it('OFF par défaut : startNappe() renvoie null même avec geste et sons actifs', () => {
    const { deps, oscs } = depsPour({ settings: reglage({ filmPad: false }), debloque: true });
    expect(startNappe(deps)).toBeNull();
    expect(oscs).toHaveLength(0);
    expect(nappeActive()).toBe(false);
  });

  it('sons coupés -> null ; pas de geste -> null', () => {
    expect(startNappe(depsPour({ settings: reglage({ filmPad: true, sounds: false }) }).deps)).toBeNull();
    expect(startNappe(depsPour({ settings: reglage({ filmPad: true }), debloque: false }).deps)).toBeNull();
  });

  it('activée + geste : démarre les accords en boucle (3 oscillateurs par accord), puis s’arrête proprement', () => {
    vi.useFakeTimers();
    const { deps, oscs, gains } = depsPour({ settings: reglage({ filmPad: true, soundVolume: 0.6 }), debloque: true });
    const stop = startNappe(deps);
    expect(stop).toBeTypeOf('function');
    expect(nappeActive()).toBe(true);
    vi.advanceTimersByTime(100); // 1er accord
    expect(oscs.length).toBe(3);
    vi.advanceTimersByTime(8000); // 2e accord
    expect(oscs.length).toBe(6);
    expect(gains[0].gain.value).toBeLessThanOrEqual(0.6 * 0.5 + 0.001); // master très doux (volume/2)
    expect(arreterNappe).toBe(stopNappe);
    stopNappe();
    expect(nappeActive()).toBe(false);
    vi.advanceTimersByTime(20000); // plus rien ne se programme
    expect(oscs.length).toBe(6);
    // le master retombe à ~0 (relâchement doux)
    const master = gains[0];
    expect(master.gain.cancelScheduledValues).toHaveBeenCalled();
    expect(master.gain.value).toBeLessThanOrEqual(0.0002);
  });

  it('la nappe occupe un créneau : un seul autre son peut jouer pendant la nappe', () => {
    vi.useFakeTimers();
    const { deps } = depsPour({ settings: reglage({ filmPad: true }), debloque: true });
    const stop = startNappe(deps);
    expect(stop).toBeTypeOf('function');
    expect(jouerSon('ding', deps)).toBe(true); // 2e créneau
    expect(jouerSon('pop', deps)).toBe(false); // plus de place
    stop?.();
    vi.advanceTimersByTime(1100); // libération du créneau nappe
    expect(jouerSon('pop', deps)).toBe(true);
  });
});
