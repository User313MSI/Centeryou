import { beforeEach, describe, expect, it } from 'vitest';

import { BackupError, BACKUP_MAX_BYTES, parseBackup, readBackupFile, serializeBackup } from '../src/lib/backup';
import { defaultSettings } from '../src/lib/defaults';
import { endMinutesOf, minutesOf } from '../src/lib/dates';
import { FREE_PREMIUM_VOICE_LIMIT_PER_MONTH } from '../src/lib/plans';
import { resetStorageReport, sanitizePersistedSubscription, sanitizePersistedVoiceQuota } from '../src/lib/safe-storage';
import { defaultSubscription, isPremiumActive, premiumVoiceRemaining } from '../src/lib/subscription';
import { useStore } from '../src/lib/store';
import type { EventItem } from '../src/types';

/**
 * M-32 Verrou 2 — preuves d'intrusion côté client (harnais local uniquement) :
 *
 * - R1 (Bastion) rejouée : un localStorage forgé « Premium » / essais de voix
 *   infinis ne passe plus la réhydratation du store (merge sanité) ;
 * - garde-fous Chrono n°1 rejoués : restauration plafonnée à 5 Mo (message FR),
 *   titres d'événements plafonnés à 140 car, fin > début remis droit.
 *
 * Aucun test ne dépend de la date réelle (dates bornées fixes : 2001 passé,
 * 2200 futur borné).
 */

const STORAGE_KEY = 'centeryou-v1';

const validEvent: EventItem = {
  id: 'e1',
  title: 'Sport',
  date: '2026-11-20',
  start: '14:00',
  end: '15:00',
  category: 'perso',
  repeat: 'jamais',
  createdAt: 1,
};

function seedStorage(state: unknown, version = 2): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version }));
}

async function rehydrate(): Promise<void> {
  await useStore.persist.rehydrate();
}

beforeEach(() => {
  window.localStorage.clear();
  resetStorageReport();
  useStore.setState({
    events: [],
    tasks: [],
    settings: { ...defaultSettings },
    subscription: { ...defaultSubscription },
    voiceQuota: { month: '', used: 0 },
    syncUpdatedAt: 0,
    hydrated: true,
  });
});

describe('R1 (Bastion) — localStorage forgé « Premium » rejoué sur le vrai merge du store', () => {
  it('attaque de Bastion : subscription {status:"active", plan:"premium", customerId:"cus_FORGED"} sans fin de période → plus Premium après réhydratation', async () => {
    seedStorage({
      events: [validEvent],
      subscription: { status: 'active', plan: 'premium', customerId: 'cus_FORGED' },
      voiceQuota: { month: '2026-11', used: 0 },
    });
    await rehydrate();
    const s = useStore.getState();
    expect(s.subscription.status).toBe('none');
    expect(s.subscription.plan).toBe('decouverte');
    expect(isPremiumActive(s.subscription)).toBe(false); // avant le correctif : true
    // les données légitimes du même stockage ne sont pas perdues
    expect(s.events).toEqual([validEvent]);
  });

  it('essais de voix « infinis » (used négatif / délirant) → compteur sain, jamais plus que l’offre gratuite', async () => {
    seedStorage({
      subscription: { status: 'active', plan: 'premium' },
      voiceQuota: { month: '2026-11', used: -100 },
    });
    await rehydrate();
    const q = useStore.getState().voiceQuota;
    expect(Number.isInteger(q.used)).toBe(true);
    expect(q.used).toBeGreaterThanOrEqual(0);
    expect(premiumVoiceRemaining(q)).toBeLessThanOrEqual(FREE_PREMIUM_VOICE_LIMIT_PER_MONTH);
    expect(isPremiumActive(useStore.getState().subscription)).toBe(false);
  });

  it('variantes forgées : chaque champ sale retombe silencieusement sur sa valeur sûre', async () => {
    seedStorage({
      subscription: {
        status: 'pwned',
        plan: 'ultra',
        customerId: "cus_' OR 1=1--",
        subscriptionId: 42,
        currentPeriodEnd: '9999-99-99T99:99',
        cancelAtPeriodEnd: 'oui',
        updatedAt: 1e18,
      },
      voiceQuota: { month: '2026-13', used: 2.5 },
    });
    await rehydrate();
    const s = useStore.getState();
    expect(s.subscription).toEqual({ ...defaultSubscription, updatedAt: 0 });
    expect(s.voiceQuota).toEqual({ month: '', used: 0 });
  });

  it('« active » avec une fin de période passée ou hors bornes → ramené à « none »', async () => {
    for (const currentPeriodEnd of ['2001-01-01T00:00:00.000Z', '9999-01-01T00:00:00.000Z', 'pas-une-date', null]) {
      window.localStorage.clear();
      useStore.setState({ subscription: { ...defaultSubscription } });
      seedStorage({ subscription: { status: 'active', plan: 'premium', currentPeriodEnd } });
      await rehydrate();
      const sub = useStore.getState().subscription;
      expect(sub.status).toBe('none');
      expect(isPremiumActive(sub)).toBe(false);
    }
  });

  it('subscription / voiceQuota non-objets → défauts sûrs, aucun crash', async () => {
    seedStorage({ subscription: 'forged', voiceQuota: [1, 2, 3] });
    await expect(rehydrate()).resolves.not.toThrow();
    expect(useStore.getState().subscription).toEqual(defaultSubscription);
    expect(useStore.getState().voiceQuota).toEqual({ month: '', used: 0 });
  });

  it('stockage LÉGITIME Premium (fin de période valide, bornée, à venir) → intact après réhydratation', async () => {
    const legit = {
      status: 'active',
      plan: 'premium',
      customerId: 'cus_REAL123',
      subscriptionId: 'sub_REAL123',
      currentPeriodEnd: '2200-01-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      updatedAt: 1700000000000,
    };
    seedStorage({
      events: [validEvent],
      tasks: [],
      settings: { ...defaultSettings, prenom: 'Camille' },
      deviceId: 'dev-1',
      subscription: legit,
      voiceQuota: { month: '2026-11', used: 2 },
      syncUpdatedAt: 42,
    });
    await rehydrate();
    const s = useStore.getState();
    expect(s.subscription).toEqual(legit);
    expect(isPremiumActive(s.subscription)).toBe(true);
    expect(s.voiceQuota).toEqual({ month: '2026-11', used: 2 });
    expect(s.settings.prenom).toBe('Camille');
    expect(s.deviceId).toBe('dev-1');
    expect(s.syncUpdatedAt).toBe(42);
    expect(s.events).toEqual([validEvent]);
  });
});

describe('R1 — sanitation directe (unités)', () => {
  it('sanitizePersistedSubscription : whitelist + bornes, champ par champ', () => {
    expect(sanitizePersistedSubscription('x')).toEqual(defaultSubscription);
    expect(sanitizePersistedSubscription({ status: 'trialing' }).status).toBe('none');
    const kept = sanitizePersistedSubscription({
      status: 'canceled',
      plan: 'premium',
      customerId: 'cus_OK_1',
      currentPeriodEnd: '2200-01-01T00:00:00.000Z',
      cancelAtPeriodEnd: true,
      updatedAt: 5,
    });
    expect(kept.status).toBe('canceled');
    expect(kept.plan).toBe('premium');
    expect(kept.customerId).toBe('cus_OK_1');
    expect(kept.currentPeriodEnd).toBe('2200-01-01T00:00:00.000Z');
    expect(kept.updatedAt).toBe(5);
  });

  it('sanitizePersistedVoiceQuota : entier positif borné, mois valide borné', () => {
    expect(sanitizePersistedVoiceQuota(null)).toEqual({ month: '', used: 0 });
    expect(sanitizePersistedVoiceQuota({ month: '2026-11', used: 3 })).toEqual({ month: '2026-11', used: 3 });
    expect(sanitizePersistedVoiceQuota({ month: '2026-11', used: -1 }).used).toBe(0);
    expect(sanitizePersistedVoiceQuota({ month: '2026-11', used: 1e18 }).used).toBe(0);
    expect(sanitizePersistedVoiceQuota({ month: '99999-01', used: 0 }).month).toBe('');
    expect(sanitizePersistedVoiceQuota({ month: '2026-00', used: 0 }).month).toBe('');
  });
});

describe('Garde-fous Chrono n°1 — restauration de sauvegarde (harnais local)', () => {
  it('fichier > 5 Mo → refus propre AVANT lecture, message clair en français', async () => {
    const gros = new Blob([new Uint8Array(BACKUP_MAX_BYTES + 1)]);
    await expect(readBackupFile(gros)).rejects.toThrow(BackupError);
    await expect(readBackupFile(gros)).rejects.toThrow(/trop volumineux/);
    await expect(readBackupFile(gros)).rejects.toThrow(/5 Mo/);
    await expect(readBackupFile(gros)).rejects.toThrow(/Aucune donnée n'a été modifiée/);
  });

  it('fichier pile à 5 Mo → accepté (lecture normale)', async () => {
    const pile = new Blob([new Uint8Array(BACKUP_MAX_BYTES)]);
    await expect(readBackupFile(pile)).resolves.toBeDefined();
  });

  it('parseBackup : titre d’événement plafonné à 140 caractères', () => {
    const json = JSON.stringify({
      app: 'centeryou',
      version: 1,
      exportedAt: '2026-11-22T10:00:00.000Z',
      events: [{ ...validEvent, title: 'A'.repeat(500_000) }],
      tasks: [],
      settings: { ...defaultSettings },
    });
    const back = parseBackup(json);
    expect(back.events).toHaveLength(1);
    expect(back.events[0].title).toHaveLength(140);
  });

  it('parseBackup : un événement qui finit avant de commencer est remis droit (fin > début), jamais fantôme', () => {
    const json = JSON.stringify({
      app: 'centeryou',
      version: 1,
      exportedAt: '2026-11-22T10:00:00.000Z',
      events: [
        { ...validEvent, id: 'nuit', start: '23:00', end: '02:00' }, // l'attaque Chrono : 23:00→02:00
        { ...validEvent, id: 'zero', start: '10:00', end: '10:00' },
        { ...validEvent, id: 'minuit', start: '23:00', end: '00:00' }, // minuit de fin de journée : LÉGITIME, conservé
        validEvent,
      ],
      tasks: [],
      settings: { ...defaultSettings },
    });
    const back = parseBackup(json);
    expect(back.events.map((e) => e.id)).toEqual(['nuit', 'zero', 'minuit', 'e1']);
    for (const ev of back.events) {
      expect(endMinutesOf(ev.end)).toBeGreaterThan(minutesOf(ev.start));
    }
    const nuit = back.events.find((e) => e.id === 'nuit');
    expect(nuit?.start).toBe('23:00');
    expect(nuit?.end).toBe('23:30'); // remis droit : 30 min, borné à 23:59
    expect(back.events.find((e) => e.id === 'minuit')?.end).toBe('00:00'); // inchangé
  });

  it('aller-retour export → import fidèle sur des données réelles', () => {
    const json = serializeBackup({ events: [validEvent], tasks: [], settings: { ...defaultSettings, prenom: 'Léa' } });
    const back = parseBackup(json);
    expect(back.events).toEqual([validEvent]);
    expect(back.settings.prenom).toBe('Léa');
  });
});
