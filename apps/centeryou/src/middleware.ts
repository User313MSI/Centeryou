import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de sécurité : CSP stricte, nonce aléatoire par requête.
 *
 * - un nonce est généré à chaque requête, posé dans l'en-tête de requête
 *   `Content-Security-Policy` (que Next.js relit pour signer ses propres
 *   scripts inline : bootstrap, données RSC `self.__next_f.push`…) et dans
 *   l'en-tête `x-nonce` (lu par le layout racine via headers(), qui pose ce
 *   nonce sur le script inline anti-flash) — `script-src` n'a donc plus
 *   besoin de 'unsafe-inline' ;
 * - la CSP complète est renvoyée au navigateur dans l'en-tête de réponse.
 *
 * - M-13 Verrou : garde-fou précoce sur les routes API — un corps annoncé
 *   (Content-Length) de plus de 2 Mo est refusé 413 AVANT lecture, pour
 *   compliquer le DoS par gros corps (chaque route applique ensuite son
 *   propre plafond plus fin).
 *
 * `style-src 'unsafe-inline'` est conservé : le layout injecte une balise
 * <style> inline (variables CSS des thèmes) et React/Next peuvent injecter des
 * styles inline — aucun contenu utilisateur n'y entre (voir journal secure.md).
 */

/** Plafond global d'un corps de requête API annoncé en Content-Length (2 Mo). */
const MAX_API_CONTENT_LENGTH = 2_000_000;

function supabaseOrigin(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function cspPolicy(nonce: string): string {
  const origin = supabaseOrigin();
  const connectSrc = ["'self'", ...(origin ? [origin] : [])].join(' ');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Refus propre (413, FR, sans détail interne) si le corps API annoncé est trop gros. */
function tooLargeApiBody(): NextResponse {
  return NextResponse.json(
    { error: 'Corps de requête trop volumineux' },
    {
      status: 413,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },
  );
}

export function middleware(request: NextRequest): NextResponse {
  // M-13 : garde-fou taille sur les routes API (avant toute lecture du corps).
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_API_CONTENT_LENGTH) {
      return tooLargeApiBody();
    }
  }

  const nonce = randomNonce();
  const policy = cspPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
