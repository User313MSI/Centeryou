/**
 * Vérification serveur d'une session Supabase (compte Centeryou).
 *
 * Le navigateur envoie « Authorization: Bearer <access_token> » (jeton de la
 * session Supabase courante) ; on le valide auprès de l'API Auth du projet
 * (GET /auth/v1/user). Aucune clé secrète côté client : la clé service (ou
 * anon publique) n'est lue que ici, côté serveur.
 */

export interface SessionUser {
  id: string;
  email: string;
}

/** Config Supabase côté serveur, ou null si aucun compte n'est possible ici. */
export function supabaseServerConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return { url, key };
}

/** Jeton Bearer de la requête, ou null s'il est absent/malformé. */
export function bearerToken(req: Request): string | null {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '');
  const t = m?.[1]?.trim();
  return t ? t.slice(0, 4096) : null;
}

/**
 * Renvoie l'utilisateur de la session Supabase, ou null si le jeton est
 * absent, invalide ou expiré (vérification déléguée à Supabase).
 */
export async function verifySessionUser(req: Request): Promise<SessionUser | null> {
  const cfg = supabaseServerConfig();
  const token = bearerToken(req);
  if (!cfg || !token) return null;
  try {
    const res = await fetch(`${cfg.url}/auth/v1/user`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: unknown; email?: unknown };
    if (typeof u.id !== 'string' || !u.id) return null;
    if (typeof u.email !== 'string' || !u.email) return null;
    return { id: u.id, email: u.email };
  } catch {
    return null;
  }
}
