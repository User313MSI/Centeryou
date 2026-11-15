// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route API serveur /api/voix : voix premium ElevenLabs 100 % côté serveur
 * (la clé n'est jamais exposée au navigateur) + quota de 300 caractères/jour/profil.
 */

type Post = (req: unknown) => Promise<Response>;

async function loadRoute(withKey: boolean): Promise<Post> {
  vi.resetModules();
  if (withKey) process.env.NEXT_ELEVENLABS_API_KEY = 'cle-serveur-de-test';
  else delete process.env.NEXT_ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const mod = await import('../src/app/api/voix/route');
  return mod.POST as unknown as Post;
}

function makeReq(body: unknown, user = 'Camille', ip = ''): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-centeryou-user': user };
  if (ip) headers['x-forwarded-for'] = ip;
  return new Request('http://localhost/api/voix', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('/api/voix — validation des requêtes', () => {
  it('503 si aucune clé serveur configurée', async () => {
    const POST = await loadRoute(false);
    const res = await POST(makeReq({ text: 'bonjour' }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.reason).toBe('not-configured');
  });

  it('400 si le corps JSON est invalide', async () => {
    const POST = await loadRoute(true);
    const res = await POST(makeReq('{pas du json'));
    expect(res.status).toBe(400);
  });

  it('400 si le texte est vide', async () => {
    const POST = await loadRoute(true);
    const res = await POST(makeReq({ text: '   ' }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('empty');
  });

  it('413 si le texte dépasse 1000 caractères', async () => {
    const POST = await loadRoute(true);
    const res = await POST(makeReq({ text: 'a'.repeat(1001) }));
    expect(res.status).toBe(413);
  });

  it('403 pour un anonyme (pas d’en-tête x-centeryou-user)', async () => {
    const POST = await loadRoute(true);
    const res = await POST(makeReq({ text: 'bonjour' }, ''));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('anonymous');
  });
});

describe('/api/voix — quota de 300 caractères/jour par profil', () => {
  it('200 + audio/mpeg + en-têtes de sécurité quand le quota suffit (ElevenLabs simulé)', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }),
    );
    const res = await POST(makeReq({ text: 'Bonjour, ceci est un test.' }, 'Alice'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('audio/mpeg');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(3);
  });

  it('le quota se cumule : 250 car OK, puis 100 car de plus refusés (429, reste 50)', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    const r1 = await POST(makeReq({ text: 'x'.repeat(250) }, 'Bob'));
    expect(r1.status).toBe(200);
    const r2 = await POST(makeReq({ text: 'y'.repeat(100) }, 'Bob'));
    expect(r2.status).toBe(429);
    const data = await r2.json();
    expect(data.reason).toBe('quota');
    expect(data.limit).toBe(300);
    expect(data.remaining).toBe(50);
    expect(data.message).toContain('Quota');
  });

  it('une fois le quota atteint (300/300), toute lecture est refusée 429', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    expect((await POST(makeReq({ text: 'z'.repeat(300) }, 'Chloe'))).status).toBe(200);
    const res = await POST(makeReq({ text: 'un caractère de plus' }, 'Chloe'));
    expect(res.status).toBe(429);
    expect((await res.json()).remaining).toBe(0);
  });

  it('le quota est par profil : un autre prénom a son propre compteur', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    await POST(makeReq({ text: 'z'.repeat(300) }, 'Dora'));
    const res = await POST(makeReq({ text: 'bonjour' }, 'Eve'));
    expect(res.status).toBe(200);
  });

  it('insensible à la casse du prénom dans la clé de quota', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    await POST(makeReq({ text: 'z'.repeat(200) }, 'Frank'));
    const res = await POST(makeReq({ text: 'z'.repeat(200) }, 'FRANK'));
    expect(res.status).toBe(429); // 400 > 300, même profil
  });

  it('ElevenLabs injoignable -> 502 avec message français clair', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau coupé')));
    const res = await POST(makeReq({ text: 'bonjour' }, 'Gina'));
    expect(res.status).toBe(502);
    expect((await res.json()).reason).toBe('upstream');
  });

  it('ElevenLabs en erreur HTTP -> 502', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const res = await POST(makeReq({ text: 'bonjour' }, 'Hugo'));
    expect(res.status).toBe(502);
  });

  it('la clé ElevenLabs n’est jamais renvoyée dans une réponse', async () => {
    const POST = await loadRoute(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    const res = await POST(makeReq({ text: 'bonjour' }, 'Ines'));
    const body = await res.text();
    expect(body).not.toContain('cle-serveur-de-test');
  });
});

describe('/api/voix — plafond par IP : 20 requêtes/heure/adresse', () => {
  function stubUpstream() {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
  }

  it('la 21e requête depuis la même IP est refusée 429 avec Retry-After et message français', async () => {
    const POST = await loadRoute(true);
    stubUpstream();
    const ip = '203.0.113.10';
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeReq({ text: 'hi' }, 'Rate', ip));
      expect(res.status).toBe(200);
    }
    const res = await POST(makeReq({ text: 'hi' }, 'Rate', ip));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.reason).toBe('rate-limit');
    expect(data.limit).toBe(20);
    expect(data.remaining).toBe(0);
    expect(data.message).toContain('20');
    const retryAfter = Number(res.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(3600);
    expect(data.retryAfter).toBe(retryAfter);
  });

  it('le plafond est par IP : une autre adresse n’est pas bloquée', async () => {
    const POST = await loadRoute(true);
    stubUpstream();
    for (let i = 0; i < 20; i++) {
      await POST(makeReq({ text: 'hi' }, 'Rate', '203.0.113.10'));
    }
    const res = await POST(makeReq({ text: 'hi' }, 'Rate', '198.51.100.23'));
    expect(res.status).toBe(200);
  });

  it('les requêtes invalides comptent aussi dans le plafond (compteur avant validation)', async () => {
    const POST = await loadRoute(true);
    stubUpstream();
    const ip = '203.0.113.99';
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeReq({ text: '' }, 'Rate', ip));
      expect(res.status).toBe(400);
    }
    const res = await POST(makeReq({ text: 'bonjour' }, 'Rate', ip));
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe('rate-limit');
  });

  it('le 429 ne fuit aucune donnée interne (clé, détail d’erreur)', async () => {
    const POST = await loadRoute(true);
    stubUpstream();
    const ip = '203.0.113.77';
    for (let i = 0; i < 20; i++) {
      await POST(makeReq({ text: 'hi' }, 'Rate', ip));
    }
    const res = await POST(makeReq({ text: 'hi' }, 'Rate', ip));
    const body = await res.text();
    expect(body).not.toContain('cle-serveur-de-test');
    expect(body).not.toContain('elevenlabs');
    expect(body).not.toContain('Error');
  });

  it('x-forwarded-for multi-IP : la dernière entrée (ajoutée par le proxy) fait foi', async () => {
    const POST = await loadRoute(true);
    stubUpstream();
    for (let i = 0; i < 20; i++) {
      await POST(makeReq({ text: 'hi' }, 'Rate', '203.0.113.10'));
    }
    // même IP réelle en dernière position, en-tête usurpé en première : toujours bloquée
    const res = await POST(makeReq({ text: 'hi' }, 'Rate', '10.0.0.1, 203.0.113.10'));
    expect(res.status).toBe(429);
    // une autre IP réelle en dernière position : autorisée
    const res2 = await POST(makeReq({ text: 'hi' }, 'Rate', '10.0.0.1, 198.51.100.7'));
    expect(res2.status).toBe(200);
  });
});
