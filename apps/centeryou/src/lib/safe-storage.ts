import type { PersistStorage, StorageValue } from 'zustand/middleware';

import type { SubscriptionState, VoiceQuota } from './subscription';

import { defaultSubscription, defaultVoiceQuota } from './subscription';

export type StorageStatus = 'ok' | 'corrupt' | 'full' | 'unavailable';

export interface StorageReport {
  status: StorageStatus;
  /** message clair en français, affichable tel quel */
  message: string | null;
  /** clé localStorage où la valeur corrompue a été sauvegardée (aucune perte) */
  backupKey: string | null;
}

let report: StorageReport = { status: 'ok', message: null, backupKey: null };

export function getStorageReport(): StorageReport {
  return { ...report };
}

export function resetStorageReport(): void {
  report = { status: 'ok', message: null, backupKey: null };
}

function note(status: StorageStatus, message: string, backupKey: string | null = null): void {
  report = { status, message, backupKey };
}

function getRawStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * PersistStorage localStorage résilient :
 * - lecture corrompue (JSON invalide) : la valeur brute est copiée sous
 *   `<name>__corrupt-<horodatage>` puis on repart sur un état neuf — l'app ne
 *   plante jamais et rien n'est perdu (la donnée est conservée à côté) ;
 * - écriture refusée (quota plein, mode privé…) : aucun crash, la dernière
 *   valeur connue reste en mémoire pour la session et un message clair est
 *   exposé via getStorageReport() ;
 * - toute lecture/écriture est protégée par try/catch.
 */
export function createSafeStorage<S>(): PersistStorage<S> {
  const mem = new Map<string, string>();

  return {
    getItem(name) {
      const storage = getRawStorage();
      let raw: string | null = null;
      if (storage) {
        try {
          raw = storage.getItem(name);
        } catch {
          note('unavailable', 'Le stockage local de ce navigateur est momentanément inaccessible.');
          raw = null;
        }
      }
      // repli sur la mémoire de session si le disque est vide ou illisible
      const effective = raw ?? mem.get(name) ?? null;
      if (effective === null) return null;
      const memRaw = mem.get(name);
      try {
        return JSON.parse(effective) as StorageValue<S>;
      } catch {
        if (memRaw !== effective) {
          // première détection de la corruption : copie de secours (une seule fois)
          const backupKey = `${name}__corrupt-${Date.now()}`;
          const s = getRawStorage();
          if (s) {
            try {
              s.setItem(backupKey, effective);
            } catch {
              // même la copie de secours échoue : on garde la valeur en mémoire
              mem.set(backupKey, effective);
            }
          } else {
            mem.set(backupKey, effective);
          }
          mem.set(name, effective);
          note(
            'corrupt',
            'Tes données sauvegardées étaient illisibles : elles ont été mises de côté et une sauvegarde neuve a démarré. Rien n’a été supprimé.',
            backupKey,
          );
        }
        return null;
      }
    },
    setItem(name, value) {
      let raw: string;
      try {
        raw = JSON.stringify(value);
      } catch {
        note('unavailable', 'Impossible de convertir les données en texte : écriture ignorée.');
        return;
      }
      mem.set(name, raw);
      const storage = getRawStorage();
      if (!storage) {
        note('unavailable', 'Aucun stockage local disponible : tes données ne seront pas conservées après fermeture de la page.');
        return;
      }
      try {
        storage.setItem(name, raw);
        if (report.status !== 'ok') report = { status: 'ok', message: null, backupKey: report.backupKey };
      } catch (err) {
        const quota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
        note(
          quota ? 'full' : 'unavailable',
          quota
            ? 'Le stockage de ce navigateur est plein : la dernière version de tes données est conservée en mémoire pour cette session, mais les nouveaux changements ne seront pas sauvegardés. Fais de la place ou exporte une sauvegarde depuis Réglages.'
            : 'Écriture dans le stockage local refusée par le navigateur : changement conservé en mémoire pour cette session uniquement.',
        );
      }
    },
    removeItem(name) {
      mem.delete(name);
      const storage = getRawStorage();
      if (!storage) return;
      try {
        storage.removeItem(name);
      } catch {
        // suppression impossible : aucun impact bloquant
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sanitation de ce qui revient du stockage (M-32 Verrou 2 — attaque  */
/* R1 de Bastion) : le localStorage est éditable par n'importe qui,    */
/* donc RIEN de ce qui y est lu n'est cru tel quel. Chaque champ       */
/* doit passer une validation stricte, sinon il retombe silencieusement */
/* sur sa valeur sûre par défaut — un stockage légitime et bien formé  */
/* n'est jamais cassé, un stockage forgé ne donne plus rien.           */
/* ------------------------------------------------------------------ */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Statuts d'abonnement connus (whitelist) — toute autre valeur retombe à « none ». */
const SUBSCRIPTION_STATUSES: readonly string[] = ['active', 'past_due', 'canceled', 'none'];

/** Plans connus (whitelist). */
const PLAN_IDS: readonly string[] = ['decouverte', 'premium'];

/** `cus_…` Stripe : caractères sûrs uniquement (jamais d'injection). */
const CUSTOMER_ID_RE = /^cus_[A-Za-z0-9_-]{1,99}$/;

/** `sub_…` Stripe. */
const SUBSCRIPTION_ID_RE = /^sub_[A-Za-z0-9_-]{1,99}$/;

/** Fenêtre bornée d'une date de fin de période crédible (bornes fixes, indépendantes de la date du jour). */
const MIN_PERIOD_END = Date.parse('2000-01-01T00:00:00.000Z');
const MAX_PERIOD_END = Date.parse('2200-01-01T00:00:00.000Z');

/** Borne d'un horodatage milliseconde crédible (≈ année 33658). */
const MAX_UPDATED_AT = 1e15;

/** Mois `YYYY-MM` valide, année bornée. */
const QUOTA_MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Compteur de voix borné (aucun entier délirant n'est cru). */
const MAX_QUOTA_USED = 1_000_000;

/**
 * Date de fin de période lue du stockage : chaîne ISO valide et bornée,
 * sinon `null`. Aucune date « roulée » (9999-99-99) ni délirante n'est conservée.
 */
function sanitizePeriodEnd(v: unknown): string | null {
  if (typeof v !== 'string' || v.length === 0 || v.length > 40) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t) || t < MIN_PERIOD_END || t > MAX_PERIOD_END) return null;
  return v;
}

/**
 * Sanite `subscription` relu du stockage local (réhydratation du store) :
 * whitelist `status`/`plan`, identifiants au format Stripe, `currentPeriodEnd`
 * ISO valide et bornée, `updatedAt` borné. Règle de cohérence : un statut
 * premium (« active » / « past_due ») exige une fin de période valide et
 * encore à venir — un vrai abonnement Stripe actif en a toujours une —
 * sinon le statut retombe à « none » : un localStorage forgé « active » sans
 * date ne donne plus le Premium.
 */
export function sanitizePersistedSubscription(input: unknown): SubscriptionState {
  const base: SubscriptionState = { ...defaultSubscription };
  if (!isRecord(input)) return base;
  let status = SUBSCRIPTION_STATUSES.includes(input.status as string) ? (input.status as SubscriptionState['status']) : 'none';
  const periodEnd = sanitizePeriodEnd(input.currentPeriodEnd);
  if ((status === 'active' || status === 'past_due') && (!periodEnd || Date.parse(periodEnd) <= Date.now())) {
    // statut premium non prouvé par une fin de période valide et à venir : ignoré
    status = 'none';
  }
  base.status = status;
  const plan = PLAN_IDS.includes(input.plan as string) ? (input.plan as SubscriptionState['plan']) : 'decouverte';
  base.plan = status === 'none' ? 'decouverte' : plan;
  if (typeof input.customerId === 'string' && CUSTOMER_ID_RE.test(input.customerId)) base.customerId = input.customerId;
  if (typeof input.subscriptionId === 'string' && SUBSCRIPTION_ID_RE.test(input.subscriptionId)) base.subscriptionId = input.subscriptionId;
  base.currentPeriodEnd = periodEnd;
  if (typeof input.cancelAtPeriodEnd === 'boolean') base.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
  if (typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt) && Math.abs(input.updatedAt) <= MAX_UPDATED_AT) {
    base.updatedAt = input.updatedAt;
  }
  return base;
}

/**
 * Sanite `voiceQuota` relu du stockage local : `month` au format `YYYY-MM`
 * valide et borné, `used` entier positif borné. Toute valeur sale est
 * ignorée silencieusement (retour au défaut), jamais d'essai infini.
 */
export function sanitizePersistedVoiceQuota(input: unknown): VoiceQuota {
  const base: VoiceQuota = { ...defaultVoiceQuota };
  if (!isRecord(input)) return base;
  if (typeof input.month === 'string') {
    const m = QUOTA_MONTH_RE.exec(input.month);
    if (m) {
      const year = Number(m[1]);
      if (year >= 2000 && year <= 2200) base.month = input.month;
    }
  }
  if (typeof input.used === 'number' && Number.isInteger(input.used) && input.used >= 0 && input.used <= MAX_QUOTA_USED) {
    base.used = input.used;
  }
  return base;
}
