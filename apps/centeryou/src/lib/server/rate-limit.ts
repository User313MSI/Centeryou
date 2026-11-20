/**
 * Limiteur de débit par adresse IP, en mémoire par instance serverless
 * (même modèle et mêmes limites connues que le plafond de /api/voix) :
 * fenêtre d'une heure fixe, compteur incrémenté AVANT toute validation
 * (les requêtes invalides comptent aussi).
 *
 * L'IP retenue est la dernière entrée de x-forwarded-for (ajoutée par le
 * proxy de confiance, ex. Vercel), sinon x-real-ip, sinon 'inconnu'.
 */

export interface RateLimitResult {
  ok: boolean;
  /** secondes à attendre avant la prochaine requête, si ok === false */
  retryAfter: number;
}

const buckets = new Map<string, { hour: string; count: number }>();

function hourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .pop();
    if (last) return last.slice(0, 60);
  }
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real.slice(0, 60);
  return 'inconnu';
}

/**
 * Consomme un crédit pour (scope, heure, IP). `scope` isole les compteurs
 * de chaque route utilisant ce module.
 */
export function checkRateLimit(req: Request, scope: string, limitPerHour: number): RateLimitResult {
  const hour = hourKey();
  if (buckets.size >= 1000) {
    buckets.forEach((v, k) => {
      if (v.hour !== hour) buckets.delete(k);
    });
  }
  const key = `${scope}:${hour}:${clientIp(req)}`;
  const entry = buckets.get(key) ?? { hour, count: 0 };
  if (entry.hour !== hour) {
    entry.hour = hour;
    entry.count = 0;
  }
  if (entry.count >= limitPerHour) {
    const retryAfter = Math.max(1, Math.ceil((3_600_000 - (Date.now() % 3_600_000)) / 1000));
    return { ok: false, retryAfter };
  }
  entry.count += 1;
  buckets.set(key, entry);
  return { ok: true, retryAfter: 0 };
}
