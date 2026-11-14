import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSafeStorage, getStorageReport, resetStorageReport } from '../src/lib/safe-storage';

beforeEach(() => {
  window.localStorage.clear();
  resetStorageReport();
});

describe('safe-storage', () => {
  it('setItem/getItem aller-retour', () => {
    const s = createSafeStorage<{ a: number }>();
    s.setItem('k', { state: { a: 1 }, version: 1 });
    expect(s.getItem('k')).toEqual({ state: { a: 1 }, version: 1 });
    expect(getStorageReport().status).toBe('ok');
  });

  it('getItem sur clé absente -> null', () => {
    expect(createSafeStorage().getItem('absente')).toBeNull();
  });

  it('JSON corrompu -> null + copie de secours + statut corrupt', () => {
    window.localStorage.setItem('k', '###pas-json###');
    const s = createSafeStorage();
    expect(s.getItem('k')).toBeNull();
    const report = getStorageReport();
    expect(report.status).toBe('corrupt');
    expect(report.backupKey).toMatch(/^k__corrupt-\d+$/);
    expect(window.localStorage.getItem(report.backupKey as string)).toBe('###pas-json###');
  });

  it('quota plein -> statut full, message clair, valeur conservée en mémoire', () => {
    const s = createSafeStorage<{ a: number }>();
    s.setItem('k', { state: { a: 1 }, version: 1 });
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(() => s.setItem('k', { state: { a: 2 }, version: 1 })).not.toThrow();
    const report = getStorageReport();
    expect(report.status).toBe('full');
    expect(report.message).toContain('plein');
    // la dernière valeur écrite avec succès sur disque reste lisible (dégradation douce)
    expect(s.getItem('k')).toEqual({ state: { a: 1 }, version: 1 });
    spy.mockRestore();
  });

  it('localStorage inaccessible -> statut unavailable, pas de crash', () => {
    const s = createSafeStorage<{ a: number }>();
    s.setItem('k', { state: { a: 1 }, version: 1 });
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(s.getItem('k')).toEqual({ state: { a: 1 }, version: 1 }); // repli mémoire
    expect(getStorageReport().status).toBe('unavailable');
    spy.mockRestore();
  });

  it('removeItem ne plante jamais', () => {
    const s = createSafeStorage();
    s.setItem('k', { state: {} });
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => s.removeItem('k')).not.toThrow();
    spy.mockRestore();
  });
});
