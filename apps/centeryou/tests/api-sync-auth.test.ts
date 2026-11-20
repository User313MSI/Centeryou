// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * M-08 — sécurité de /api/sync et /api/compte/suppression (audit Sentinelle n°1 et n°2) :
 * - /api/sync : limiteur de débit par IP (comme /api/voix) + authentification par session
 *   Supabase (Bearer) vérifiée côté serveur avant toute lecture/écriture, avec
 *   correspondance au compte (e-mail du client Stripe) quand Stripe est configuré ;
 * - /api/compte/suppression : session authentifiée exigée, l'e-mail supprimé est
 *   celui de la session — jamais une adresse fournie dans le corps.
 */

const SUPA_URL = 'https://supa.test';
const SERVICE_KEY = 'service-role-test';
const STRIPE_KEY = 'sk_test_faux_pour_test';
const BON_JETON = 'bon-jeton-de-test';
const SESSION = { id: 'u-1', email: 'camille@exemple.fr' };

let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `10.77.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

interface FetchCall {
  url: string;
  method: string;
  auth: string;
}

let calls: FetchCall[] = [];

function installFetch(opts: {
  session?: typeof SESSION | null;
  customerEmail?: string | null;
  deleteStatus?: number;
}) {
  calls = [];
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const auth = headers.Authorization ?? '';
    calls.push({ url, method: init?.method ?? 'GET', auth });
    if (url.includes('/auth/v1/user')) {
      if (!opts.session || auth !== `Bearer ${BON_JETON}`) {
        return new Response(JSON.stringify({ message: 'Jeton invalide' }), { status: 401 });
      }
      return Response.json(opts.session);
    }
    if (url.includes('api.stripe.com/v1/customers/')) {
      return Response.json({ id: 'cus_1', email: opts.customerEmail ?? null });
    }
    if (url.includes('/rest/v1/comptes')) {
      return new Response('[]', { status: opts.deleteStatus ?? 200 });
    }
    return new Response('introuvable', { status: 404 });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function stubSupabaseConfigured() {
  vi.stubEnv('SUPABASE_URL', SUPA_URL);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
}

function stubNothingConfigured() {
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
}

function stubStripe() {
  vi.stubEnv('STRIPE_SECRET_KEY', STRIPE_KEY);
}

async function loadSync() {
  const mod = await import('../src/app/api/sync/route');
  return {
    GET: mod.GET as unknown as (req: Request) => Promise<Response>,
    POST: mod.POST as unknown as (req: Request) => Promise<Response>,
  };
}

async function loadSuppression() {
  const mod = await import('../src/app/api/compte/suppression/route');
  return mod.POST as unknown as (req: Request) => Promise<Response>;
}

function getSync(customerId: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost/api/sync?customerId=${encodeURIComponent(customerId)}`, {
    headers: { 'x-forwarded-for': freshIp(), ...headers },
  });
}

function postSync(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': freshIp(), ...headers },
    body,
  });
}

function postSuppression(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/compte/suppression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': freshIp(), ...headers },
    body,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('GET/POST /api/sync — authentification (M-08)', () => {
  it('lecture sans preuve d’identité → 401 propre (Supabase configuré)', async () => {
    stubSupabaseConfigured();
    stubStripe();
    installFetch({ session: SESSION, customerEmail: 'camille@exemple.fr' });
    const { GET } = await loadSync();
    const res = await GET(getSync('cus_1'));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain('Session');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('écriture sans preuve d’identité → 401 et rien n’est persisté', async () => {
    stubSupabaseConfigured();
    stubStripe();
    installFetch({ session: SESSION, customerEmail: 'camille@exemple.fr' });
    const { GET, POST } = await loadSync();
    const res = await POST(postSync(JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: { events: [] } })));
    expect(res.status).toBe(401);
    const got = await GET(getSync('cus_1', { Authorization: `Bearer ${BON_JETON}` }));
    expect(got.status).toBe(200);
    expect((await got.json()).snapshot).toBeNull();
  });

  it('jeton invalide → 401', async () => {
    stubSupabaseConfigured();
    stubStripe();
    installFetch({ session: SESSION, customerEmail: 'camille@exemple.fr' });
    const { GET } = await loadSync();
    const res = await GET(getSync('cus_1', { Authorization: 'Bearer mauvais-jeton' }));
    expect(res.status).toBe(401);
  });

  it('session valide correspondant au compte → écriture puis lecture acceptées (200)', async () => {
    stubSupabaseConfigured();
    stubStripe();
    // e-mail du client Stripe identique à celui de la session, casse différente acceptée
    installFetch({ session: SESSION, customerEmail: 'Camille@Exemple.fr' });
    const { GET, POST } = await loadSync();
    const auth = { Authorization: `Bearer ${BON_JETON}` };
    const snap = { customerId: 'cus_1', updatedAt: 42, state: { settings: { theme: 'clair' } } };
    const res = await POST(postSync(JSON.stringify(snap), auth));
    expect(res.status).toBe(200);
    const got = await GET(getSync('cus_1', auth));
    expect(got.status).toBe(200);
    const data = await got.json();
    expect(data.snapshot.customerId).toBe('cus_1');
    expect(data.snapshot.state.settings.theme).toBe('clair');
    // la vérification de propriété a bien consulté le client Stripe correspondant
    expect(calls.some((c) => c.url.includes('api.stripe.com/v1/customers/cus_1'))).toBe(true);
  });

  it('session valide mais compte appartenant à un autre e-mail → 403 (lecture et écriture)', async () => {
    stubSupabaseConfigured();
    stubStripe();
    installFetch({ session: SESSION, customerEmail: 'quelquun@ailleurs.fr' });
    const { GET, POST } = await loadSync();
    const auth = { Authorization: `Bearer ${BON_JETON}` };
    expect((await GET(getSync('cus_1', auth))).status).toBe(403);
    expect((await POST(postSync(JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: {} }), auth))).status).toBe(403);
  });

  it('Stripe configuré mais Supabase absent → 503 refus propre (le point d’entrée n’est jamais ouvert)', async () => {
    stubNothingConfigured();
    stubStripe();
    installFetch({});
    const { GET, POST } = await loadSync();
    expect((await GET(getSync('cus_1'))).status).toBe(503);
    expect((await POST(postSync(JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: {} })))).status).toBe(503);
  });

  it('limiteur de débit : la 21e requête depuis une même IP → 429 + Retry-After (comme /api/voix)', async () => {
    stubSupabaseConfigured();
    stubStripe();
    installFetch({ session: SESSION, customerEmail: 'camille@exemple.fr' });
    const { GET } = await loadSync();
    const auth = { Authorization: `Bearer ${BON_JETON}` };
    const sameIp = '10.66.6.6';
    for (let i = 0; i < 20; i += 1) {
      const res = await GET(getSync('cus_1', { ...auth, 'x-forwarded-for': sameIp }));
      expect(res.status).toBe(200);
    }
    const res = await GET(getSync('cus_1', { ...auth, 'x-forwarded-for': sameIp }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const data = await res.json();
    expect(data.reason).toBe('rate-limit');
    expect(data.limit).toBe(20);
    expect(data.message).toContain('Trop de requêtes');
    // une autre IP n’est pas bloquée
    const other = await GET(getSync('cus_1', auth));
    expect(other.status).toBe(200);
  });
});

describe('POST /api/compte/suppression — authentification (M-08)', () => {
  it('sans preuve d’identité → 401 et aucun DELETE exécuté côté Supabase', async () => {
    stubSupabaseConfigured();
    installFetch({ session: SESSION });
    const POST = await loadSuppression();
    const res = await POST(postSuppression(JSON.stringify({ email: 'camille@exemple.fr' })));
    expect(res.status).toBe(401);
    expect((await res.json()).serverDeleted).toBe(false);
    expect(calls.filter((c) => c.url.includes('/rest/v1/comptes'))).toHaveLength(0);
  });

  it('jeton invalide → 401, aucun DELETE', async () => {
    stubSupabaseConfigured();
    installFetch({ session: SESSION });
    const POST = await loadSuppression();
    const res = await POST(postSuppression(JSON.stringify({}), { Authorization: 'Bearer mauvais' }));
    expect(res.status).toBe(401);
    expect(calls.filter((c) => c.url.includes('/rest/v1/comptes'))).toHaveLength(0);
  });

  it('session authentifiée → suppression acceptée, e-mail cible = celui de la session (jamais celui du corps)', async () => {
    stubSupabaseConfigured();
    installFetch({ session: SESSION });
    const POST = await loadSuppression();
    const res = await POST(postSuppression(JSON.stringify({}), { Authorization: `Bearer ${BON_JETON}` }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.serverDeleted).toBe(true);
    const del = calls.find((c) => c.url.includes('/rest/v1/comptes'));
    expect(del).toBeTruthy();
    expect(del?.method).toBe('DELETE');
    expect(decodeURIComponent(del?.url ?? '')).toContain('email=eq.camille@exemple.fr');
  });

  it('e-mail du corps différent de la session → 403, aucun DELETE', async () => {
    stubSupabaseConfigured();
    installFetch({ session: SESSION });
    const POST = await loadSuppression();
    const res = await POST(
      postSuppression(JSON.stringify({ email: 'victime@exemple.fr' }), { Authorization: `Bearer ${BON_JETON}` }),
    );
    expect(res.status).toBe(403);
    expect(calls.filter((c) => c.url.includes('/rest/v1/comptes'))).toHaveLength(0);
  });

  it('e-mail du corps identique à la session → accepté', async () => {
    stubSupabaseConfigured();
    installFetch({ session: SESSION });
    const POST = await loadSuppression();
    const res = await POST(
      postSuppression(JSON.stringify({ email: 'camille@exemple.fr' }), { Authorization: `Bearer ${BON_JETON}` }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).serverDeleted).toBe(true);
  });

  it('Supabase non configuré → accusé de réception sans effet de bord (comportement inchangé)', async () => {
    stubNothingConfigured();
    installFetch({});
    const POST = await loadSuppression();
    const res = await POST(postSuppression(JSON.stringify({ email: 'camille@exemple.fr' })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.serverDeleted).toBe(false);
    expect(data.reason).toBe('aucun compte serveur configure a ce jour');
    expect(calls.filter((c) => c.url.includes('/rest/v1/comptes'))).toHaveLength(0);
  });
});
