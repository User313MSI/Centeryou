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
 * `style-src 'unsafe-inline'` est conservé : le layout injecte une balise
 * <style> inline (variables CSS des thèmes) et React/Next peuvent injecter des
 * styles inline — aucun contenu utilisateur n'y entre (voir journal secure.md).
 */

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

export function middleware(request: NextRequest): NextResponse {
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
