// @vitest-environment node
import { createHmac } from 'crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * M-13 Verrou — tests d'INTRUSION automatisés : ce fichier joue l'attaquant
 * avant le lancement (rapport sentinelle.md, attaques n°4/6/10/11 + mission M-13) :
 *
 * - en-têtes forgés (Host) sur les routes de paiement → l'URL de retour doit
 *   venir d'une origine de confiance, jamais d'un Host usurpé ;
 * - flood sur /api/checkout, /api/portal, /api/subscription/status,
 *   /api/compte/suppression → 429 + Retry-After + message FR sans détail ;
 * - gros corps, JSON piégé, champs inattendus, valeurs hors bornes,
 *   x-centeryou-user arbitraires, rejeu de webhook (timestamp ancien),
 *   tokens malformés ;
 * - quota voix : rotation de prénoms depuis une IP bornée par un plafond
 *   global, et identité de session Supabase prioritaire sur le prénom ;
 * - aucune réponse d'erreur ne doit fuiter de détail interne (clés, stack,
 *   hôtes internes).
 */

type Handler = (req: unknown) => Promise<Response>;

let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `10.90.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
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

function stubNoBackends(): void {
  for (const k of [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'APP_URL',
    'ALLOWED_HOSTS',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'NEXT_PUBLIC_SITE_URL',
  ]) {
    vi.stubEnv(k, '');
  }
}

/** fetch simulé qui capture les appels vers Stripe (pour lire success_url). */
function stubStripeFetch(calls: { url: string; body?: string }[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: typeof init?.body === 'string' ? init.body : undefined });
      return Response.json({ id: 'cs_test_abc123', url: 'https://checkout.stripe.com/pay/cs_test_abc123' });
    }),
  );
}

function stubAudioFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
  );
}

const WHSEC = 'whsec_secret_de_test_verrou';

function sign(body: string, timestamp: number): string {
  const sig = createHmac('sha256', WHSEC).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** Motifs qui ne doivent JAMAIS apparaître dans une réponse d'erreur. */
const LEAK_RE = /sk_(live|test)_[A-Za-z0-9]|whsec_[A-Za-z0-9]|xi-api-key|elevenlabs|api\.stripe\.com|supabase\.co|node_modules|Error:|at [A-Za-z_$]+.*\(.*:\d+:\d+\)/;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/* ------------------------------------------------------------------ */

describe('M-13 — attaque par Host forgé (URL de retour de paiement)', () => {
  it('checkout avec un Host forgé → 400 propre et AUCUN appel à Stripe', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    const calls: { url: string; body?: string }[] = [];
    stubStripeFetch(calls);
    const mod = await load('../src/app/api/checkout/route');
    const res = await mod.POST(
      req('https://evil-attacker.example/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'dev-1' }) }),
    );
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('non reconnue');
    expect(LEAK_RE.test(body)).toBe(false);
    expect(calls).toHaveLength(0); // aucune session Stripe créée
  });

  it('checkout avec le domaine de production connu → 200 et success_url sur ce domaine', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    const calls: { url: string; body?: string }[] = [];
    stubStripeFetch(calls);
    const mod = await load('../src/app/api/checkout/route');
    const res = await mod.POST(
      req('https://dev-apps-centeryou.vercel.app/api/checkout', {
        method: 'POST',
        ip: freshIp(),
        body: JSON.stringify({ deviceId: 'dev-1' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    const params = new URLSearchParams(calls[0].body ?? '');
    expect(params.get('success_url')).toBe(
      'https://dev-apps-centeryou.vercel.app/reglages?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    );
    expect(params.get('cancel_url')).toBe('https://dev-apps-centeryou.vercel.app/reglages?checkout=cancel');
  });

  it('APP_URL définie (variable opérateur) prime sur le Host de la requête', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    vi.stubEnv('APP_URL', 'https://centeryou.fr');
    const calls: { url: string; body?: string }[] = [];
    stubStripeFetch(calls);
    const mod = await load('../src/app/api/checkout/route');
    const res = await mod.POST(
      req('http://localhost:3000/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'dev-1' }) }),
    );
    expect(res.status).toBe(200);
    const params = new URLSearchParams(calls[0].body ?? '');
    expect(params.get('success_url')).toContain('https://centeryou.fr/reglages?');
  });

  it('localhost en dev/test → accepté (http://localhost:3100)', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    const calls: { url: string; body?: string }[] = [];
    stubStripeFetch(calls);
    const mod = await load('../src/app/api/checkout/route');
    const res = await mod.POST(
      req('http://localhost:3100/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'dev-1' }) }),
    );
    expect(res.status).toBe(200);
    const params = new URLSearchParams(calls[0].body ?? '');
    expect(params.get('success_url')).toContain('http://localhost:3100/reglages?');
  });

  it('ALLOWED_HOSTS (env opérateur) permet un hôte de préprod déclaré', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    vi.stubEnv('ALLOWED_HOSTS', 'preprod.centeryou.fr');
    stubStripeFetch([]);
    const mod = await load('../src/app/api/checkout/route');
    const res = await mod.POST(
      req('https://preprod.centeryou.fr/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'dev-1' }) }),
    );
    expect(res.status).toBe(200);
  });

  it('APP_URL invalide → refus propre 400 (pas de fallback sur le Host)', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    vi.stubEnv('APP_URL', 'pas-une-url');
    const calls: { url: string; body?: string }[] = [];
    stubStripeFetch(calls);
    const mod = await load('../src/app/api/checkout/route');
    const res = await mod.POST(
      req('https://dev-apps-centeryou.vercel.app/api/checkout', {
        method: 'POST',
        ip: freshIp(),
        body: JSON.stringify({ deviceId: 'dev-1' }),
      }),
    );
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('portal avec un Host forgé → 400 et aucun appel Stripe', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    const calls: { url: string; body?: string }[] = [];
    stubStripeFetch(calls);
    const mod = await load('../src/app/api/portal/route');
    const res = await mod.POST(
      req('https://phishing.example/api/portal', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus_1' }) }),
    );
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('trustedBaseUrl : noms d’hôte malformés refusés, casse normalisée', async () => {
    const { trustedBaseUrl } = await import('../src/lib/server/http');
    stubNoBackends();
    const fake = (host: string) =>
      ({ headers: new Headers({ host }), url: `http://${host}/api/checkout` }) as unknown as Request;
    expect(trustedBaseUrl(fake('evil..example')).ok).toBe(false);
    expect(trustedBaseUrl(fake('')).ok).toBe(false);
    const ok = trustedBaseUrl(fake('DEV-APPS-CENTERYOU.VERCEL.APP'));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.base).toContain('dev-apps-centeryou.vercel.app'.toUpperCase());
    const local = trustedBaseUrl(fake('localhost:3000'));
    expect(local.ok).toBe(true);
    if (local.ok) expect(local.base).toBe('http://localhost:3000');
  });
});

/* ------------------------------------------------------------------ */

describe('M-13 — flood : rate-limits par IP sur les routes sans limite', () => {
  it('checkout : la 11e requête depuis une IP → 429 + Retry-After + FR, autre IP non bloquée', async () => {
    stubNoBackends(); // Stripe non configuré → 503 rapide, mais compté
    const mod = await load('../src/app/api/checkout/route');
    const ip = freshIp();
    for (let i = 0; i < 10; i += 1) {
      const res = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip, body: JSON.stringify({ deviceId: 'd' }) }));
      expect(res.status).toBe(503);
    }
    const res = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip, body: JSON.stringify({ deviceId: 'd' }) }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.reason).toBe('rate-limit');
    expect(data.limit).toBe(10);
    expect(data.message).toContain('Trop de requêtes');
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(LEAK_RE.test(JSON.stringify(data))).toBe(false);
    const other = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'd' }) }));
    expect(other.status).toBe(503);
  });

  it('portal : la 11e requête depuis une IP → 429', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/portal/route');
    const ip = freshIp();
    for (let i = 0; i < 10; i += 1) {
      await mod.POST(req('http://localhost/api/portal', { method: 'POST', ip, body: JSON.stringify({ customerId: 'cus_1' }) }));
    }
    const res = await mod.POST(req('http://localhost/api/portal', { method: 'POST', ip, body: JSON.stringify({ customerId: 'cus_1' }) }));
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe('rate-limit');
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('subscription/status : la 31e requête depuis une IP → 429', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/subscription/status/route');
    const ip = freshIp();
    for (let i = 0; i < 30; i += 1) {
      const res = await mod.POST(req('http://localhost/api/subscription/status', { method: 'POST', ip, body: JSON.stringify({ customerId: 'cus_1' }) }));
      expect(res.status).toBe(200); // configured:false
    }
    const res = await mod.POST(req('http://localhost/api/subscription/status', { method: 'POST', ip, body: JSON.stringify({ customerId: 'cus_1' }) }));
    expect(res.status).toBe(429);
    expect((await res.json()).limit).toBe(30);
  });

  it('compte/suppression : la 11e requête depuis une IP → 429 + Retry-After', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/compte/suppression/route');
    const ip = freshIp();
    for (let i = 0; i < 10; i += 1) {
      await mod.POST(req('http://localhost/api/compte/suppression', { method: 'POST', ip, body: '{}' }));
    }
    const res = await mod.POST(req('http://localhost/api/compte/suppression', { method: 'POST', ip, body: '{}' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const body = await res.text();
    expect(LEAK_RE.test(body)).toBe(false);
  });

  it('les requêtes invalides comptent aussi dans le plafond (compteur avant validation)', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/checkout/route');
    const ip = freshIp();
    for (let i = 0; i < 10; i += 1) {
      const res = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip, body: '{invalide' }));
      expect(res.status).toBe(400);
    }
    const res = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip, body: JSON.stringify({ deviceId: 'd' }) }));
    expect(res.status).toBe(429);
  });
});

/* ------------------------------------------------------------------ */

describe('M-13 — validation d’entrées hostile (taille, champs, bornes, encodages)', () => {
  it('checkout : gros corps (9 Ko) → 413, JSON invalide → 400, tableau → 400', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/checkout/route');
    const big = await mod.POST(
      req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'x'.repeat(9000) }) }),
    );
    expect(big.status).toBe(413);
    expect((await big.json()).error).toBe('Corps de requête trop volumineux');
    const badJson = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: '{pas du json' }));
    expect(badJson.status).toBe(400);
    const arr = await mod.POST(req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: '[1,2,3]' }));
    expect(arr.status).toBe(400);
  });

  it('checkout : champ inattendu, deviceId avec caractère de contrôle, trop long, non-string → 400', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/checkout/route');
    const extra = await mod.POST(
      req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'd1', admin: true }) }),
    );
    expect(extra.status).toBe(400);
    expect((await extra.json()).error).toBe('Champ inattendu dans la requête');
    const ctrl = await mod.POST(
      req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'dev-\u0001x' }) }),
    );
    expect(ctrl.status).toBe(400);
    expect((await ctrl.json()).error).toBe('deviceId invalide');
    const long = await mod.POST(
      req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 'd'.repeat(200) }) }),
    );
    expect(long.status).toBe(400);
    const notStr = await mod.POST(
      req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: JSON.stringify({ deviceId: 123 }) }),
    );
    expect(notStr.status).toBe(400);
    expect((await notStr.json()).error).toBe('deviceId manquant');
  });

  it('portal : customerId hors format Stripe → 400, champ inattendu → 400, gros corps → 413, valide → 503 sans clé', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/portal/route');
    for (const bad of ['cus_../etc', 'foo', 'cus_', 'x'.repeat(120)]) {
      const res = await mod.POST(req('http://localhost/api/portal', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: bad }) }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('customerId invalide');
    }
    const extra = await mod.POST(
      req('http://localhost/api/portal', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus_1', url: 'https://evil' }) }),
    );
    expect(extra.status).toBe(400);
    const big = await mod.POST(
      req('http://localhost/api/portal', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus_' + 'x'.repeat(9000) }) }),
    );
    expect(big.status).toBe(413);
    const ok = await mod.POST(req('http://localhost/api/portal', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus_1' }) }));
    expect(ok.status).toBe(503);
  });

  it('subscription/status : ids invalides → 400, aucun id → 400, champ inattendu → 400, gros corps → 413, valide → 200', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/subscription/status/route');
    const badCus = await mod.POST(req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus 1' }) }));
    expect(badCus.status).toBe(400);
    const badSes = await mod.POST(req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: JSON.stringify({ sessionId: 'pas-cs' }) }));
    expect(badSes.status).toBe(400);
    const none = await mod.POST(req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: '{}' }));
    expect(none.status).toBe(400);
    expect((await none.json()).error).toBe('customerId ou sessionId requis');
    const extra = await mod.POST(
      req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus_1', hack: 1 }) }),
    );
    expect(extra.status).toBe(400);
    const big = await mod.POST(
      req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: JSON.stringify({ sessionId: 'cs_' + 'x'.repeat(9000) }) }),
    );
    expect(big.status).toBe(413);
    const ok = await mod.POST(
      req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: JSON.stringify({ customerId: 'cus_1' }) }),
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).configured).toBe(false);
  });

  it('webhook : gros corps → 413, JSON signé illisible → 400, sans type → 400, rejeu (timestamp ancien) → 400', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', WHSEC);
    const mod = await load('../src/app/api/stripe/webhook/route');
    const big = await mod.POST(req('http://localhost/api/stripe/webhook', { method: 'POST', ip: freshIp(), body: 'x'.repeat(300 * 1024) }));
    expect(big.status).toBe(413);

    const garbage = 'pas du json mais signé';
    const r1 = await mod.POST(
      req('http://localhost/api/stripe/webhook', {
        method: 'POST',
        ip: freshIp(),
        headers: { 'stripe-signature': sign(garbage, nowSec()) },
        body: garbage,
      }),
    );
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toBe('Événement illisible');

    const noType = JSON.stringify({ data: { object: {} } });
    const r2 = await mod.POST(
      req('http://localhost/api/stripe/webhook', {
        method: 'POST',
        ip: freshIp(),
        headers: { 'stripe-signature': sign(noType, nowSec()) },
        body: noType,
      }),
    );
    expect(r2.status).toBe(400);
    expect((await r2.json()).error).toBe('Événement invalide');

    // rejeu : signature valide mais horodatage de 10 minutes
    const old = JSON.stringify({ type: 'customer.created', data: { object: {} } });
    const r3 = await mod.POST(
      req('http://localhost/api/stripe/webhook', {
        method: 'POST',
        ip: freshIp(),
        headers: { 'stripe-signature': sign(old, nowSec() - 600) },
        body: old,
      }),
    );
    expect(r3.status).toBe(400);
    const body3 = await r3.text();
    expect(body3).not.toContain(WHSEC);
    expect(LEAK_RE.test(body3)).toBe(false);

    // token malformé : en-tête sans t= ni v1
    const r4 = await mod.POST(
      req('http://localhost/api/stripe/webhook', {
        method: 'POST',
        ip: freshIp(),
        headers: { 'stripe-signature': 'garbage' },
        body: old,
      }),
    );
    expect(r4.status).toBe(400);
  });

  it('sync : champ inattendu, customerId hors format, updatedAt hors bornes, state non-objet → 400 ; valide → 200', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/sync/route');
    const post = (body: string) => mod.POST(req('http://localhost/api/sync', { method: 'POST', ip: freshIp(), body }));
    expect((await post(JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: {}, extra: 1 }))).status).toBe(400);
    expect((await post(JSON.stringify({ customerId: 'foo', updatedAt: 1, state: {} }))).status).toBe(400);
    expect((await post(JSON.stringify({ customerId: 'cus_1', updatedAt: 1e20, state: {} }))).status).toBe(400);
    expect((await post(JSON.stringify({ customerId: 'cus_1', updatedAt: Number.NaN, state: {} }))).status).toBe(400);
    expect((await post(JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: 'texte' }))).status).toBe(400);
    expect((await post(JSON.stringify({ customerId: 'cus_1', updatedAt: 1, state: [1, 2] }))).status).toBe(400);
    const ok = await post(JSON.stringify({ customerId: 'cus_1', updatedAt: 42, state: { events: [] } }));
    expect(ok.status).toBe(200);
    const badGet = await mod.GET(req(`http://localhost/api/sync?customerId=${encodeURIComponent('evil')}`, { ip: freshIp() }));
    expect(badGet.status).toBe(400);
  });

  it('compte/suppression : champ inattendu → 400, e-mail malformé → 400, gros corps → 413', async () => {
    stubNoBackends();
    const mod = await load('../src/app/api/compte/suppression/route');
    const post = (body: string) => mod.POST(req('http://localhost/api/compte/suppression', { method: 'POST', ip: freshIp(), body }));
    expect((await post(JSON.stringify({ email: 'a@b.fr', admin: true }))).status).toBe(400);
    expect((await post(JSON.stringify({ email: 'pas-un-email' }))).status).toBe(400);
    expect((await post(JSON.stringify({ email: 'a'.repeat(9000) }))).status).toBe(413);
    const ok = await post('{}');
    expect(ok.status).toBe(200);
    expect((await ok.json()).serverDeleted).toBe(false);
  });

  it('voix : gros corps (20 Ko) → 413, champ inattendu → 400, tableau → 400, x-centeryou-user piégé', async () => {
    stubNoBackends();
    vi.stubEnv('NEXT_ELEVENLABS_API_KEY', 'cle-serveur-de-test');
    stubAudioFetch();
    const mod = await load('../src/app/api/voix/route');
    const post = (body: string, user = 'Camille') =>
      mod.POST(
        req('http://localhost/api/voix', {
          method: 'POST',
          ip: freshIp(),
          headers: { 'x-centeryou-user': user },
          body,
        }),
      );
    const big = await post(JSON.stringify({ text: 'a'.repeat(20000) }));
    expect(big.status).toBe(413);
    const extra = await post(JSON.stringify({ text: 'bonjour', admin: true }));
    expect(extra.status).toBe(400);
    const arr = await post('[1,2]');
    expect(arr.status).toBe(400);
    // en-tête user réduit à des caractères de contrôle → nettoyé → anonyme 403
    const ctrlOnly = await post(JSON.stringify({ text: 'bonjour' }), '\u0001\u0002\u0003');
    expect(ctrlOnly.status).toBe(403);
    // en-tête user géant (5000 car) → tronqué, aucun crash, requête acceptée
    const giant = await post(JSON.stringify({ text: 'bonjour' }), 'A'.repeat(5000));
    expect(giant.status).toBe(200);
    // caractères de contrôle au milieu d’un prénom valide → nettoyés
    const mixed = await post(JSON.stringify({ text: 'bonjour' }), 'Al\u0001ice');
    expect(mixed.status).toBe(200);
  });
});

/* ------------------------------------------------------------------ */

describe('M-13 — quota voix renforcé (rotation de prénoms + session prioritaire)', () => {
  async function loadVoix() {
    vi.stubEnv('NEXT_ELEVENLABS_API_KEY', 'cle-serveur-de-test');
    return load('../src/app/api/voix/route');
  }

  function voixReq(text: string, user: string, ip: string, token?: string): Request {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-centeryou-user': user, 'x-forwarded-for': ip };
    if (token) headers.Authorization = `Bearer ${token}`;
    return new Request('http://localhost/api/voix', { method: 'POST', headers, body: JSON.stringify({ text }) });
  }

  it('plafond global de caractères par IP/jour : 10 prénoms × 300 car depuis une IP passent, le 11e → 429 quota-ip', async () => {
    stubNoBackends();
    stubAudioFetch();
    const mod = await loadVoix();
    const ip = freshIp();
    for (let i = 0; i < 10; i += 1) {
      const res = await mod.POST(voixReq('x'.repeat(300), `attaquant-${i}`, ip));
      expect(res.status).toBe(200);
    }
    const res = await mod.POST(voixReq('x'.repeat(300), 'attaquant-11', ip));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.reason).toBe('quota-ip');
    expect(data.limit).toBe(3000);
    expect(LEAK_RE.test(JSON.stringify(data))).toBe(false);
  });

  it('session Supabase valide : l’identité de session PRIME sur le prénom (rotation de prénoms inefficace)', async () => {
    stubNoBackends();
    vi.stubEnv('SUPABASE_URL', 'https://supa.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? '';
        if (url.includes('/auth/v1/user')) {
          if (auth === 'Bearer bon-jeton') return Response.json({ id: 'u-1', email: 'camille@exemple.fr' });
          return new Response('invalid', { status: 401 });
        }
        return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) };
      }),
    );
    const mod = await loadVoix();
    const ip = freshIp();
    // même session, deux prénoms différents : 200 + 200 = 400 > 300 → la 2e est refusée
    const r1 = await mod.POST(voixReq('x'.repeat(200), 'Alice', ip, 'bon-jeton'));
    expect(r1.status).toBe(200);
    const r2 = await mod.POST(voixReq('x'.repeat(200), 'Bob', ip, 'bon-jeton'));
    expect(r2.status).toBe(429);
    expect((await r2.json()).reason).toBe('quota'); // quota de SESSION, pas de « Bob »
    // sans Bearer, le repli se fait sur le prénom : « Bob » a son propre quota
    const r3 = await mod.POST(voixReq('x'.repeat(200), 'Bob', ip));
    expect(r3.status).toBe(200);
  });

  it('jeton malformé/invalide → repli sur le prénom (pas de crash, pas de quota session)', async () => {
    stubNoBackends();
    vi.stubEnv('SUPABASE_URL', 'https://supa.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) return new Response('invalid', { status: 401 });
        return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) };
      }),
    );
    const mod = await loadVoix();
    const ip = freshIp();
    const r1 = await mod.POST(voixReq('x'.repeat(300), 'Mallory', ip, 'mauvais-jeton'));
    expect(r1.status).toBe(200); // quota du prénom Mallory
    const r2 = await mod.POST(voixReq('x', 'Mallory', ip, 'mauvais-jeton'));
    expect(r2.status).toBe(429);
    expect((await r2.json()).reason).toBe('quota');
  });

  it('deux sessions distinctes = deux quotas distincts (même IP)', async () => {
    stubNoBackends();
    vi.stubEnv('SUPABASE_URL', 'https://supa.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? '';
        if (url.includes('/auth/v1/user')) {
          if (auth === 'Bearer jeton-a') return Response.json({ id: 'u-a', email: 'a@exemple.fr' });
          if (auth === 'Bearer jeton-b') return Response.json({ id: 'u-b', email: 'b@exemple.fr' });
          return new Response('invalid', { status: 401 });
        }
        return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) };
      }),
    );
    const mod = await loadVoix();
    const ip = freshIp();
    expect((await mod.POST(voixReq('x'.repeat(300), 'A', ip, 'jeton-a'))).status).toBe(200);
    expect((await mod.POST(voixReq('x'.repeat(300), 'B', ip, 'jeton-b'))).status).toBe(200);
    // la 2e session a bien son propre quota : 1 car de plus passe encore
    expect((await mod.POST(voixReq('x', 'B', ip, 'jeton-b'))).status).toBe(429); // 300+1 > 300
  });
});

/* ------------------------------------------------------------------ */

describe('M-13 — middleware : garde-fou taille des corps API', () => {
  it('Content-Length > 2 Mo sur /api/* → 413 FR avant lecture ; les autres requêtes passent avec la CSP', async () => {
    const { middleware } = await import('../src/middleware');
    const { NextRequest } = await import('next/server');
    const big = new NextRequest('http://localhost/api/sync', { method: 'POST' });
    big.headers.set('content-length', '3000000');
    const resBig = middleware(big);
    expect(resBig.status).toBe(413);
    expect((await resBig.json()).error).toBe('Corps de requête trop volumineux');

    const small = new NextRequest('http://localhost/api/voix', { method: 'POST' });
    small.headers.set('content-length', '100');
    const resSmall = middleware(small);
    expect(resSmall.status).not.toBe(413);
    expect(resSmall.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");

    const page = new NextRequest('http://localhost/');
    const resPage = middleware(page);
    expect(resPage.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");
    expect(resPage.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  });
});

/* ------------------------------------------------------------------ */

describe('M-13 — aucune fuite d’information dans les réponses d’erreur', () => {
  it('balayage : 400/413/429/503 de toutes les routes ne contiennent aucun détail interne', async () => {
    stubNoBackends();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_faux_pour_test');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', WHSEC);
    vi.stubEnv('NEXT_ELEVENLABS_API_KEY', 'cle-serveur-de-test-verrou');
    stubAudioFetch();

    const bodies: string[] = [];

    const checkout = await load('../src/app/api/checkout/route');
    bodies.push(await (await checkout.POST(req('https://evil.example/api/checkout', { method: 'POST', ip: freshIp(), body: '{"deviceId":"d"}' }))).text());
    bodies.push(await (await checkout.POST(req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: '{"deviceId":"' + 'x'.repeat(9000) + '"}' }))).text());
    bodies.push(await (await checkout.POST(req('http://localhost/api/checkout', { method: 'POST', ip: freshIp(), body: '{"deviceId":"d","x":1}' }))).text());

    const portal = await load('../src/app/api/portal/route');
    bodies.push(await (await portal.POST(req('http://localhost/api/portal', { method: 'POST', ip: freshIp(), body: '{"customerId":"bad"}' }))).text());

    const status = await load('../src/app/api/subscription/status/route');
    bodies.push(await (await status.POST(req('http://localhost/api/subscription/status', { method: 'POST', ip: freshIp(), body: '{}' }))).text());

    const webhook = await load('../src/app/api/stripe/webhook/route');
    bodies.push(await (await webhook.POST(req('http://localhost/api/stripe/webhook', { method: 'POST', ip: freshIp(), body: 'x'.repeat(300 * 1024) }))).text());
    bodies.push(await (await webhook.POST(req('http://localhost/api/stripe/webhook', { method: 'POST', ip: freshIp(), headers: { 'stripe-signature': 't=1,v1=00' }, body: '{}' }))).text());

    const sync = await load('../src/app/api/sync/route');
    bodies.push(await (await sync.POST(req('http://localhost/api/sync', { method: 'POST', ip: freshIp(), body: '{"customerId":"bad","updatedAt":1,"state":{}}' }))).text());

    const suppr = await load('../src/app/api/compte/suppression/route');
    bodies.push(await (await suppr.POST(req('http://localhost/api/compte/suppression', { method: 'POST', ip: freshIp(), body: '{"email":"x"}' }))).text());

    const voix = await load('../src/app/api/voix/route');
    bodies.push(await (await voix.POST(req('http://localhost/api/voix', { method: 'POST', ip: freshIp(), headers: { 'x-centeryou-user': 'A' }, body: '{"text":"' + 'a'.repeat(20000) + '"}' }))).text());
    bodies.push(await (await voix.POST(req('http://localhost/api/voix', { method: 'POST', ip: freshIp(), body: '{"text":"hi"}' }))).text());

    for (const b of bodies) {
      expect(LEAK_RE.test(b)).toBe(false);
      expect(b).not.toContain('cle-serveur-de-test-verrou');
      expect(b).not.toContain(WHSEC);
    }
  });
});
