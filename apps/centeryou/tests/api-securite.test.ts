// @vitest-environment node
import { createHmac } from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyWebhookSignature } from '../src/lib/server/stripe';

/**
 * Sécurité des routes API : signature HMAC des webhooks Stripe (avec tolérance
 * d'horodatage anti-rejeu) et hygiène des erreurs (aucun détail interne dans
 * les réponses 500).
 */

const SECRET = 'whsec_secret_de_test';

function sign(body: string, timestamp: number | string, secret = SECRET): string {
  const sig = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('verifyWebhookSignature — HMAC-SHA256 Stripe', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'ping', data: { object: {} } });

  it('accepte une signature valide et récente', () => {
    expect(verifyWebhookSignature(body, sign(body, nowSec()), SECRET)).toBe(true);
  });

  it('rejette un corps altéré (intégrité)', () => {
    const header = sign(body, nowSec());
    expect(verifyWebhookSignature(body + ' ', header, SECRET)).toBe(false);
  });

  it('rejette une mauvaise signature / un mauvais secret', () => {
    expect(verifyWebhookSignature(body, sign(body, nowSec()), 'whsec_mauvais')).toBe(false);
    expect(verifyWebhookSignature(body, `t=${nowSec()},v1=${'ab'.repeat(32)}`, SECRET)).toBe(false);
  });

  it('rejette sans en-tête, sans secret, ou en-tête malformé', () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, nowSec()), '')).toBe(false);
    expect(verifyWebhookSignature(body, `v1=${'ab'.repeat(32)}`, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, `t=${nowSec()}`, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, `t=abc,v1=${'ab'.repeat(32)}`, SECRET)).toBe(false);
  });

  it('bloque le rejeu : horodatage de plus de 5 minutes (passé ou futur)', () => {
    const t = nowSec();
    expect(verifyWebhookSignature(body, sign(body, t - 301), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, t + 301), SECRET)).toBe(false);
    // limite acceptée : 300 s pile
    expect(verifyWebhookSignature(body, sign(body, t - 300), SECRET)).toBe(true);
  });

  it('accepte plusieurs signatures v1 si l’une est valide (rotation de secret Stripe)', () => {
    const t = nowSec();
    const header = `t=${t},v1=${'cd'.repeat(32)},v1=${createHmac('sha256', SECRET).update(`${t}.${body}`, 'utf8').digest('hex')}`;
    expect(verifyWebhookSignature(body, header, SECRET)).toBe(true);
  });
});

describe('POST /api/stripe/webhook — route', () => {
  async function loadPost() {
    const mod = await import('../src/app/api/stripe/webhook/route');
    return mod.POST as unknown as (req: Request) => Promise<Response>;
  }

  function makeReq(body: string, signature: string | null): Request {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (signature) headers['stripe-signature'] = signature;
    return new Request('http://localhost/api/stripe/webhook', { method: 'POST', headers, body });
  }

  it('400 sans en-tête de signature', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
    const POST = await loadPost();
    const res = await POST(makeReq('{}', null));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Signature invalide');
  });

  it('400 si la signature est invalide', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
    const POST = await loadPost();
    const body = JSON.stringify({ type: 'customer.created', data: { object: {} } });
    const res = await POST(makeReq(body, `t=${nowSec()},v1=${'00'.repeat(32)}`));
    expect(res.status).toBe(400);
  });

  it('200 si la signature est valide et récente (événement non géré = reçu)', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
    const POST = await loadPost();
    const body = JSON.stringify({ type: 'customer.created', data: { object: {} } });
    const res = await POST(makeReq(body, sign(body, nowSec())));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  it('400 anti-rejeu : signature valide mais horodatage vieux de 10 minutes', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
    const POST = await loadPost();
    const body = JSON.stringify({ type: 'customer.created', data: { object: {} } });
    const res = await POST(makeReq(body, sign(body, nowSec() - 600)));
    expect(res.status).toBe(400);
  });

  it('400 si aucun secret webhook n’est configuré côté serveur', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const POST = await loadPost();
    const body = '{}';
    const res = await POST(makeReq(body, sign(body, nowSec())));
    expect(res.status).toBe(400);
  });
});

describe('hygiène des erreurs — aucun détail interne dans les réponses', () => {
  it('POST /api/checkout en 500 ne renvoie pas le message d’erreur interne (ex. détail Stripe)', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connexion refusée — détail interne sk_test_faux_pour_test')));
    const mod = await import('../src/app/api/checkout/route');
    const POST = mod.POST as unknown as (req: Request) => Promise<Response>;
    const res = await POST(
      new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'd1' }),
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain('sk_test_faux_pour_test');
    expect(body).not.toContain('connexion refusée');
    const data = JSON.parse(body);
    expect(data.error).toBe('Erreur interne lors de la création du paiement');
  });

  it('POST /api/checkout sans STRIPE_SECRET_KEY → 503 propre (refus sans clé)', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const mod = await import('../src/app/api/checkout/route');
    const POST = mod.POST as unknown as (req: Request) => Promise<Response>;
    const res = await POST(
      new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'd1' }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    // Nuage (M-23) : message réécrit en français courant pour le client (Cactus M-28) ;
    // le test garde son esprit « aucun détail interne » et l'étend au nom de variable.
    expect(data.error).toBe('Le paiement en ligne n’est pas encore activé — réessaie plus tard.');
    expect(data.error).not.toContain('STRIPE_SECRET_KEY');
  });

  it('POST /api/portal sans STRIPE_SECRET_KEY → 503 propre (refus sans clé)', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const mod = await import('../src/app/api/portal/route');
    const POST = mod.POST as unknown as (req: Request) => Promise<Response>;
    const res = await POST(
      new Request('http://localhost/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: 'cus_1' }),
      }),
    );
    expect(res.status).toBe(503);
  });
});

describe('POST /api/sync — garde-fous', () => {
  async function loadRoute() {
    const mod = await import('../src/app/api/sync/route');
    return { GET: mod.GET as unknown as (req: Request) => Promise<Response>, POST: mod.POST as unknown as (req: Request) => Promise<Response> };
  }

  function postReq(body: string): Request {
    return new Request('http://localhost/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  it('GET sans customerId → 400 ; customerId trop long → 400', async () => {
    const { GET } = await loadRoute();
    expect((await GET(new Request('http://localhost/api/sync'))).status).toBe(400);
    expect((await GET(new Request('http://localhost/api/sync?customerId=' + 'x'.repeat(101)))).status).toBe(400);
  });

  it('POST avec JSON invalide → 400 propre', async () => {
    const { POST } = await loadRoute();
    const res = await POST(postReq('{pas du json'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Corps de requête JSON invalide');
  });

  it('POST avec un corps > 1 Mo → 413 (plafond anti-abus)', async () => {
    const { POST } = await loadRoute();
    const big = JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: 'x'.repeat(1_000_001) });
    const res = await POST(postReq(big));
    expect(res.status).toBe(413);
  });

  it('POST valide (repli mémoire sans clés KV) → 200, puis GET relit le snapshot', async () => {
    vi.stubEnv('KV_REST_API_URL', '');
    vi.stubEnv('KV_REST_API_TOKEN', '');
    const { GET, POST } = await loadRoute();
    const snap = { customerId: 'cus_test', updatedAt: 42, state: { settings: { theme: 'clair' } } };
    const res = await POST(postReq(JSON.stringify(snap)));
    expect(res.status).toBe(200);
    const got = await GET(new Request('http://localhost/api/sync?customerId=cus_test'));
    expect(got.status).toBe(200);
    const data = await got.json();
    expect(data.snapshot.customerId).toBe('cus_test');
    expect(data.snapshot.state.settings.theme).toBe('clair');
  });
});
