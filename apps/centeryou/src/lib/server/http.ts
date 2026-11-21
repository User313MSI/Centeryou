import { NextResponse } from 'next/server';

import { checkRateLimit } from './rate-limit';

/**
 * Utilitaires HTTP communs aux routes API (M-13 Verrou) — sécurité offensive :
 *
 * - réponses JSON avec en-têtes de sécurité + `Cache-Control: no-store` ;
 * - limiteur de débit par IP (modèle /api/voix) avec 429 propre, `Retry-After`
 *   et message 100 % FR sans aucun détail interne ;
 * - lecture de corps JSON plafonnée (413 au-delà) et parsing sûr (400) ;
 * - rejet des champs inattendus, validation de formats (ids Stripe, e-mail,
 *   chaînes imprimables sans caractère de contrôle) — tout à la main, sans
 *   bibliothèque ;
 * - origine de confiance pour les URL de retour de paiement : `APP_URL` si
 *   définie (variable opérateur), sinon l'en-tête `Host` UNIQUEMENT s'il
 *   figure dans la liste des hôtes connus (domaines de production) ou si
 *   c'est localhost — un `Host` forgé ne peut plus dériver `success_url`.
 */

export const NO_STORE: Record<string, string> = { 'Cache-Control': 'no-store' };

const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function json(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...BASE_HEADERS, ...NO_STORE, ...extra } });
}

/* ------------------------------------------------------------------ */
/* Limiteur de débit (modèle /api/voix : 429 + Retry-After, FR)        */
/* ------------------------------------------------------------------ */

/**
 * Consomme un crédit de débit pour (scope, IP). Renvoie la réponse 429
 * prête à renvoyer si le plafond est atteint, sinon null.
 */
export function rateLimitOrNull(req: Request, scope: string, limitPerHour: number): NextResponse | null {
  const hit = checkRateLimit(req, scope, limitPerHour);
  if (hit.ok) return null;
  return json(
    {
      ok: false,
      reason: 'rate-limit',
      limit: limitPerHour,
      remaining: 0,
      retryAfter: hit.retryAfter,
      message: `Trop de requêtes depuis cette adresse : plafond de ${limitPerHour} appels par heure. Réessaie dans ${hit.retryAfter} seconde${hit.retryAfter > 1 ? 's' : ''}.`,
    },
    429,
    { 'Retry-After': String(hit.retryAfter) },
  );
}

/* ------------------------------------------------------------------ */
/* Lecture et validation du corps                                      */
/* ------------------------------------------------------------------ */

export type JsonBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/**
 * Lit le corps de la requête en texte (plafonné à `maxBytes` → 413) puis le
 * parse en JSON (400 si invalide ou si ce n'est pas un objet plat attendu).
 * Aucun détail interne dans les messages.
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<JsonBodyResult> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, response: json({ error: 'Corps de requête illisible' }, 400) };
  }
  if (raw.length > maxBytes) {
    return { ok: false, response: json({ error: 'Corps de requête trop volumineux' }, 413) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    return { ok: false, response: json({ error: 'Corps de requête JSON invalide' }, 400) };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: json({ error: 'Corps de requête JSON invalide' }, 400) };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}

/** Liste les clés du corps qui ne figurent pas dans `allowed` (champs inattendus). */
export function unknownFields(body: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(body).filter((k) => !allowed.includes(k));
}

/** Chaîne imprimable, sans caractère de contrôle, longueur ≤ maxLen. */
export function isSafeText(value: unknown, maxLen: number): value is string {
  if (typeof value !== 'string') return false;
  if (value.length > maxLen) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\x00-\x1F\x7F]/.test(value);
}

/** `customerId` Stripe : préfixe cus_ + caractères alphanumériques sûrs. */
export function isValidCustomerId(value: unknown): value is string {
  return typeof value === 'string' && /^cus_[A-Za-z0-9_-]{1,99}$/.test(value);
}

/** `session_id` de session Checkout Stripe : préfixe cs_ (ou cs_test_). */
export function isValidCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_(test_)?[A-Za-z0-9_-]{1,120}$/.test(value);
}

/** Adresse e-mail simple, sans caractère de contrôle, longueur raisonnable. */
export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    isSafeText(value, 254) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,63}$/.test(value)
  );
}

/* ------------------------------------------------------------------ */
/* Origine de confiance (URL de retour de paiement)                    */
/* ------------------------------------------------------------------ */

/** Hôtes de production connus (jamais de joker *.vercel.app : un Host forgé ne doit pas pouvoir rediriger). */
const KNOWN_PRODUCTION_HOSTS: readonly string[] = [
  'dev-apps-centeryou.vercel.app',
  'centeryou.fr',
  'www.centeryou.fr',
];

function hostFromEnvList(envValue: string | undefined): string[] {
  return (envValue ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function siteUrlHost(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  );
}

export type TrustedBaseResult =
  | { ok: true; base: string }
  | { ok: false; response: NextResponse };

/**
 * Base d'URL de confiance pour construire `success_url` / `cancel_url` /
 * `return_url` :
 *
 * 1. `APP_URL` si définie (variable opérateur) — doit être une URL absolue
 *    http(s) valide, sinon refus propre (400) ;
 * 2. sinon l'en-tête `Host` de la requête, UNIQUEMENT si son nom d'hôte est
 *    localhost (dev) ou dans la liste des hôtes de production connus
 *    (NEXT_PUBLIC_SITE_URL, centeryou.fr, ALLOWED_HOSTS). En production, tout
 *    autre Host est refusé proprement (400) : un paiement ne peut plus être
 *    redirigé vers un domaine forgé.
 */
export function trustedBaseUrl(req: Request): TrustedBaseResult {
  const refused = (): TrustedBaseResult => ({
    ok: false,
    response: json({ error: 'Adresse de retour non reconnue : opération refusée par sécurité.' }, 400),
  });

  const appUrl = (process.env.APP_URL ?? '').trim().replace(/\/+$/, '');
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return refused();
      return { ok: true, base: appUrl };
    } catch {
      return refused();
    }
  }

  // En-tête Host s'il est présent (requête HTTP réelle), sinon hôte de l'URL
  // (Next.js construit req.url à partir du Host de la requête).
  const hostHeader = (req.headers.get('host') ?? '').trim() || new URL(req.url).host;
  if (!hostHeader || hostHeader.length > 253) return refused();
  let hostname: string;
  try {
    hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
  } catch {
    return refused();
  }
  // Nom d'hôte syntaxiquement sain : labels alphanumériques/tirets (ou littéral IP),
  // jamais de séparateur, d'espace ou de slash — « evil..example » ou « a/b » sont refusés.
  const HOSTNAME_RE = /^(\[[0-9a-f:.]+\]|[0-9a-f:.]+|[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*)$/;
  if (!hostname || !HOSTNAME_RE.test(hostname)) return refused();

  const isDev = process.env.NODE_ENV === 'development';
  if (isLocalHostname(hostname)) {
    const proto = forwardedProto(req) ?? 'http';
    return { ok: true, base: `${proto}://${hostHeader}` };
  }
  if (isDev) {
    // en développement local, tout hôte est accepté (ex. 192.168.x.x:3000)
    const proto = forwardedProto(req) ?? 'http';
    return { ok: true, base: `${proto}://${hostHeader}` };
  }
  const allowed = new Set<string>([
    ...KNOWN_PRODUCTION_HOSTS,
    ...hostFromEnvList(process.env.ALLOWED_HOSTS),
    ...(siteUrlHost() ? [siteUrlHost() as string] : []),
  ]);
  if (!allowed.has(hostname)) return refused();
  const proto = forwardedProto(req) ?? 'https';
  return { ok: true, base: `${proto}://${hostHeader}` };
}

function forwardedProto(req: Request): string | null {
  const raw = req.headers.get('x-forwarded-proto') ?? '';
  const last = raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean).pop();
  if (last === 'https' || last === 'http') return last;
  return null;
}
