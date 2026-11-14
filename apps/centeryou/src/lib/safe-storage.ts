import type { PersistStorage, StorageValue } from 'zustand/middleware';

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
