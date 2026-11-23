// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * M-32 Verrou 2 — tests d'INTRUSION : on REJOUE les attaques 🔴 R2, R3 et 🟠 O3
 * du rapport Bastion (M-24) sur harnais local UNIQUEMENT (vraies routes importées,
 * Supabase Auth et Stripe simulés par un fetch stubbé — zéro appel externe, jamais
 * la production, jamais de vraie clé). Après le correctif, chaque attaque doit
 * ÉCHOUER. L'usage local pur (ni Supabase ni Stripe) est inchangé.
 */

type Handler = (req: unknown) => Promise<Response>;

const SUPA_URL = 'https://supa.test';
const SERVICE_KEY = 'service-role-test';
const STRIPE_KEY = 'sk_test_faux_pour_test';

const TOKENS: Record<string, { id: string; email: string }> = {
  'token-alice': { id: 'u-alice', email: 'alice@exemple.fr' },
  'token-bob': { id: 'u-bob', email: 'bob@exemple.fr' },
};

const CUSTOMERS: Record<string, string | null> = {
  cus_ALICE: 'alice@exemple.fr',
  cus_VICTIM: 'victime@exemple.fr',
};

let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `10.31.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

function req(url: string, init: RequestInit & { ip?: string } = {}): Request {
  const { ip, ...rest } = init;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((rest.headers ?? {}) as Record<string, string>),
  };
  if (ip) headers['x-forwarded-for'] = ip;
  return new Request(url, { ...rest, headers });
}

async function load(path: string): Promise<Record<string, Handler>> {
  vi.resetModules();
  return (await import(path)) as unknown as Record<string, Handler>;
}

/** Appels Stripe réellement effectués (pour prouver qu'aucun n'a lieu en cas de refus). */
let stripeCalls: { url: string; body?: string }[] = [];

function installFetch(): void {
  stripeCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const auth = headers.Authorization ?? '';
      if (url.includes('/auth/v1/user')) {
        const token = auth.replace(/^Bearer\s+/i, '');
        const user = TOKENS[token];
        if (!user) return new Response(JSON.stringify({ message: 'Jeton invalide' }), { status: 401 });
        return Response.json(user);
      }
      if (url.includes('api.stripe.com/v1/')) {
        stripeCalls.push({ url, body: typeof init?.body === 'string' ? init.body : undefined });
        if (url.includes('/v1/customers/')) {
          const id = decodeURIComponent(url.split('/v1/customers/')[1].split('?')[0]);
          return Response.json({ id, email: CUSTOMERS[id] ?? null });
        }
        if (url.includes('/v1/billing_portal/sessions')) {
          return Response.json({ url: 'https://billing.stripe.com/session/TEST_SESSION' });
        }
        if (url.includes('/v1/subscriptions')) {
          return Response.json({ data: [] });
        }
        if (url.includes('/v1/checkout/sessions/')) {
          return Response.json({ id: 'cs_test_1', customer: 'cus_ALICE', subscription: null });
        }
        return Response.json({});
      }
      return new Response('introuvable', { status: 404 });
    }),
  );
}

function stubSupabaseOnly(): void {
  vi.stubEnv('SUPABASE_URL', SUPA_URL);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
}

function stubSupabaseAndStripe(): void {
  stubSupabaseOnly();
  vi.stubEnv('STRIPE_SECRET_KEY', STRIPE_KEY);
}

function stubStripeOnly(): void {
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', STRIPE_KEY);
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
}

function stubNothing(): void {
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
}

const alice = { Authorization: 'Bearer token-alice' };
const bob = { Authorization: 'Bearer token-bob' };

function getSync(customerId: string, headers: Record<string, string> = {}): Request {
  return req(`http://localhost/api/sync?customerId=${encodeURIComponent(customerId)}`, { ip: freshIp(), headers });
}

function postSync(body: string, headers: Record<string, string> = {}): Request {
  return req('http://localhost/api/sync', { method: 'POST', ip: freshIp(), headers, body });
}

function postPortal(customerId: string, headers: Record<string, string> = {}): Request {
  return req('http://localhost/api/portal', { method: 'POST', ip: freshIp(), headers, body: JSON.stringify({ customerId }) });
}

function postStatus(body: string, headers: Record<string, string> = {}): Request {
  return req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), headers, body });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/* ------------------------------------------------------------------ */
/* R2 — IDOR /api/sync en configuration Supabase-SANS-Stripe          */
/* ------------------------------------------------------------------ */

describe('R2 (Bastion) rejouée — /api/sync lié à l’identité de session, jamais à un cus_ libre', () => {
  it('Alice écrit sur cus_VICTIM (Supabase ON, Stripe OFF) → 200 mais le snapshot est indexé par SA session ; Bob ne le lit PAS', async () => {
    stubSupabaseOnly();
    installFetch();
    const { GET, POST } = await load('../src/app/api/sync/route');

    // attaque : Alice pousse un snapshot « POISON » sur le cus_ de la victime
    const poison = await POST(
      postSync(JSON.stringify({ customerId: 'cus_VICTIM', updatedAt: 1, state: { events: [{ title: 'POISON' }] } }), alice),
    );
    expect(poison.status).toBe(200);

    // avant le correctif : Bob lisait ce snapshot (200 + POISON). Après : rien.
    const lectureBob = await GET(getSync('cus_VICTIM', bob));
    expect(lectureBob.status).toBe(200);
    expect((await lectureBob.json()).snapshot).toBeNull();

    // la sauvegarde d’Alice reste accessible… à Alice seule (clé = user:u-alice), quel que soit le cus_ demandé
    const lectureAlice = await GET(getSync('cus_VICTIM', alice));
    expect(lectureAlice.status).toBe(200);
    const snapAlice = (await lectureAlice.json()).snapshot;
    expect(snapAlice.state.events[0].title).toBe('POISON');
    const lectureAliceAutreCus = await GET(getSync('cus_AUTRE', alice));
    expect((await lectureAliceAutreCus.json()).snapshot.state.events[0].title).toBe('POISON');
    // et Bob écrivant sur cus_VICTIM ne voit pas celui d’Alice
    await POST(postSync(JSON.stringify({ customerId: 'cus_VICTIM', updatedAt: 2, state: { events: [{ title: 'BOB' }] } }), bob));
    const bobRead = await GET(getSync('cus_VICTIM', bob));
    expect((await bobRead.json()).snapshot.state.events[0].title).toBe('BOB');
    expect(stripeCalls).toHaveLength(0); // Stripe non configuré : aucun appel externe
  });

  it('sans session → 401 (lecture et écriture), jeton invalide → 401', async () => {
    stubSupabaseOnly();
    installFetch();
    const { GET, POST } = await load('../src/app/api/sync/route');
    expect((await GET(getSync('cus_VICTIM'))).status).toBe(401);
    expect((await POST(postSync(JSON.stringify({ customerId: 'cus_VICTIM', updatedAt: 1, state: {} })))).status).toBe(401);
    expect((await GET(getSync('cus_VICTIM', { Authorization: 'Bearer mauvais' }))).status).toBe(401);
  });

  it('Stripe ON + Supabase ON : e-mail de session ≠ e-mail du client → 403 (rejeu, toujours tenu)', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const { GET, POST } = await load('../src/app/api/sync/route');
    expect((await GET(getSync('cus_VICTIM', alice))).status).toBe(403);
    expect((await POST(postSync(JSON.stringify({ customerId: 'cus_VICTIM', updatedAt: 1, state: {} }), alice))).status).toBe(403);
    // compte correspondant à la session → accepté
    expect((await POST(postSync(JSON.stringify({ customerId: 'cus_ALICE', updatedAt: 1, state: {} }), alice))).status).toBe(200);
    expect((await GET(getSync('cus_ALICE', alice))).status).toBe(200);
  });

  it('usage local pur (aucun backend) → repli mémoire inchangé (200/200)', async () => {
    stubNothing();
    installFetch();
    const { GET, POST } = await load('../src/app/api/sync/route');
    const res = await POST(postSync(JSON.stringify({ customerId: 'cus_test', updatedAt: 42, state: { settings: { theme: 'clair' } } })));
    expect(res.status).toBe(200);
    const got = await GET(getSync('cus_test'));
    expect(got.status).toBe(200);
    expect((await got.json()).snapshot.state.settings.theme).toBe('clair');
  });

  it('Stripe ON sans Supabase → 503 fail-closed (inchangé)', async () => {
    stubStripeOnly();
    installFetch();
    const { GET, POST } = await load('../src/app/api/sync/route');
    expect((await GET(getSync('cus_VICTIM'))).status).toBe(503);
    expect((await POST(postSync(JSON.stringify({ customerId: 'cus_VICTIM', updatedAt: 1, state: {} })))).status).toBe(503);
  });
});

/* ------------------------------------------------------------------ */
/* R3 — /api/portal : session exigée + e-mail de session = e-mail client */
/* ------------------------------------------------------------------ */

describe('R3 (Bastion) rejouée — le portail de facturation exige la session ET la propriété du compte', () => {
  it('sans session → 401 et AUCUN appel Stripe (avant : 200 + URL du portail de la victime)', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/portal/route');
    const res = await mod.POST(postPortal('cus_VICTIM'));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain('Session');
    expect(stripeCalls.filter((c) => c.url.includes('billing_portal'))).toHaveLength(0);
  });

  it('session d’Alice sur le compte de la victime → 403 et aucun portail créé', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/portal/route');
    const res = await mod.POST(postPortal('cus_VICTIM', alice));
    expect(res.status).toBe(403);
    expect(stripeCalls.filter((c) => c.url.includes('billing_portal'))).toHaveLength(0);
  });

  it('session dont l’e-mail = e-mail du client → 200 + URL du portail (flux légitime tenu)', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/portal/route');
    const res = await mod.POST(postPortal('cus_ALICE', alice));
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://billing.stripe.com/session/TEST_SESSION');
    const appel = stripeCalls.find((c) => c.url.includes('billing_portal'));
    expect(appel?.body).toContain('customer=cus_ALICE');
  });

  it('Stripe ON sans Supabase → 503 fail-closed (identité invérifiable)', async () => {
    stubStripeOnly();
    installFetch();
    const mod = await load('../src/app/api/portal/route');
    const res = await mod.POST(postPortal('cus_VICTIM'));
    expect(res.status).toBe(503);
    expect(stripeCalls.filter((c) => c.url.includes('billing_portal'))).toHaveLength(0);
  });

  it('usage local pur (Stripe OFF) → 503 « non disponible », inchangé', async () => {
    stubNothing();
    installFetch();
    const mod = await load('../src/app/api/portal/route');
    expect((await mod.POST(postPortal('cus_VICTIM'))).status).toBe(503);
  });
});

/* ------------------------------------------------------------------ */
/* O3 — /api/subscription/status : plus d’oracle sans auth             */
/* ------------------------------------------------------------------ */

describe('O3 (Bastion) rejouée — /api/subscription/status exige la session', () => {
  it('Stripe ON + Supabase ON, sans session → 401 (avant : 200 + statut du cus_ de n’importe qui)', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/subscription/status/route');
    const res = await mod.POST(postStatus(JSON.stringify({ customerId: 'cus_VICTIM' })));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain('Session');
  });

  it('session d’Alice sur cus_VICTIM (e-mail différent) → 403', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/subscription/status/route');
    const res = await mod.POST(postStatus(JSON.stringify({ customerId: 'cus_VICTIM' }), alice));
    expect(res.status).toBe(403);
  });

  it('session correspondant au compte → 200 (flux légitime tenu)', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/subscription/status/route');
    const res = await mod.POST(postStatus(JSON.stringify({ customerId: 'cus_ALICE' }), alice));
    expect(res.status).toBe(200);
    expect((await res.json()).configured).toBe(true);
  });

  it('sessionId de retour Checkout seul + session valide → 200 (pas d’oracle cus_ sans e-mail)', async () => {
    stubSupabaseAndStripe();
    installFetch();
    const mod = await load('../src/app/api/subscription/status/route');
    const res = await mod.POST(postStatus(JSON.stringify({ sessionId: 'cs_test_abc123' }), alice));
    expect(res.status).toBe(200);
    expect((await res.json()).configured).toBe(true);
  });

  it('Stripe ON sans Supabase → 503 fail-closed', async () => {
    stubStripeOnly();
    installFetch();
    const mod = await load('../src/app/api/subscription/status/route');
    expect((await mod.POST(postStatus(JSON.stringify({ customerId: 'cus_VICTIM' })))).status).toBe(503);
  });

  it('usage local pur (Stripe OFF) → 200 {configured:false}, inchangé', async () => {
    stubNothing();
    installFetch();
    const mod = await load('../src/app/api/subscription/status/route');
    const res = await mod.POST(postStatus(JSON.stringify({ customerId: 'cus_VICTIM' })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.configured).toBe(false);
    expect(data.snapshot).toBeNull();
  });
});
