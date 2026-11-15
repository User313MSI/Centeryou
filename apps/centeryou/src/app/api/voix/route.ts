import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_CHAR_LIMIT = 300;
const MAX_TEXT_LENGTH = 1000;
// Plafond anti-abus par adresse IP, en plus du quota par profil ci-dessous.
const RATE_LIMIT_PER_HOUR = 20;
const ELEVENLABS_API_KEY = process.env.NEXT_ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_VOICE_ID =
  process.env.NEXT_ELEVENLABS_VOICE_ID ?? process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

const usageByDay = new Map<string, { day: string; used: number }>();
const rateByIp = new Map<string, { hour: string; count: number }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

/**
 * Adresse IP du client : dernière entrée de x-forwarded-for (ajoutée par le
 * proxy de confiance, ex. Vercel), sinon x-real-ip, sinon 'inconnu'.
 */
function clientIp(req: NextRequest): string {
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

function pruneRate(hour: string): void {
  if (rateByIp.size < 1000) return;
  rateByIp.forEach((v, k) => {
    if (v.hour !== hour) rateByIp.delete(k);
  });
}

function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store',
    ...extra,
  };
}

function json(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: baseHeaders(extra) });
}

function pruneUsage(day: string): void {
  if (usageByDay.size < 500) return;
  usageByDay.forEach((v, k) => {
    if (v.day !== day) usageByDay.delete(k);
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1) Plafond par IP (toutes requêtes confondues, même invalides) avant tout traitement.
  const hour = hourKey();
  pruneRate(hour);
  const ip = clientIp(req);
  const rateKey = `${hour}:${ip}`;
  const rate = rateByIp.get(rateKey) ?? { hour, count: 0 };
  if (rate.hour !== hour) {
    rate.hour = hour;
    rate.count = 0;
  }
  if (rate.count >= RATE_LIMIT_PER_HOUR) {
    const retryAfter = Math.max(1, Math.ceil((3_600_000 - (Date.now() % 3_600_000)) / 1000));
    return json(
      {
        ok: false,
        reason: 'rate-limit',
        limit: RATE_LIMIT_PER_HOUR,
        remaining: 0,
        retryAfter,
        message: `Trop de requêtes depuis cette adresse : plafond de ${RATE_LIMIT_PER_HOUR} appels par heure. Réessaie dans ${retryAfter} seconde${retryAfter > 1 ? 's' : ''} — la voix de ton navigateur reste disponible.`,
      },
      429,
      { 'Retry-After': String(retryAfter) },
    );
  }
  rate.count += 1;
  rateByIp.set(rateKey, rate);

  if (!ELEVENLABS_API_KEY) {
    return json(
      { ok: false, reason: 'not-configured', message: 'Voix premium non configurée côté serveur.' },
      503,
    );
  }

  let text: unknown;
  try {
    const body = await req.json();
    text = body && typeof body === 'object' ? (body as { text?: unknown }).text : undefined;
  } catch {
    return json({ ok: false, reason: 'bad-request', message: 'Corps de requête JSON invalide.' }, 400);
  }
  if (typeof text !== 'string' || !text.trim()) {
    return json({ ok: false, reason: 'empty', message: 'Le texte à lire est vide.' }, 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return json(
      { ok: false, reason: 'too-long', message: `Texte trop long : ${MAX_TEXT_LENGTH} caractères maximum par lecture.` },
      413,
    );
  }

  const user = (req.headers.get('x-centeryou-user') ?? '').trim().slice(0, 60);
  if (!user) {
    return json(
      {
        ok: false,
        reason: 'anonymous',
        message: 'Voix premium réservée aux profils renseignés — la voix du navigateur est utilisée à la place.',
      },
      403,
    );
  }

  const day = todayKey();
  pruneUsage(day);
  const quotaKey = `${day}:${user.toLowerCase()}`;
  const entry = usageByDay.get(quotaKey) ?? { day, used: 0 };
  if (entry.day !== day) {
    entry.day = day;
    entry.used = 0;
  }
  const remaining = Math.max(0, DAILY_CHAR_LIMIT - entry.used);
  if (text.length > remaining) {
    return json(
      {
        ok: false,
        reason: 'quota',
        limit: DAILY_CHAR_LIMIT,
        remaining,
        message: `Quota de voix premium atteint pour aujourd'hui (${DAILY_CHAR_LIMIT} caractères par jour, ${remaining} restante${remaining > 1 ? 's' : ''}). La voix de ton navigateur prend le relais.`,
      },
      429,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
  } catch {
    return json(
      { ok: false, reason: 'upstream', message: 'Service de voix premium injoignable — la voix du navigateur prend le relais.' },
      502,
    );
  }
  if (!upstream.ok) {
    return json(
      { ok: false, reason: 'upstream', message: 'Service de voix premium indisponible pour le moment — la voix du navigateur prend le relais.' },
      502,
    );
  }

  const audio = Buffer.from(await upstream.arrayBuffer());
  entry.used += text.length;
  usageByDay.set(quotaKey, entry);

  return new NextResponse(new Uint8Array(audio), {
    status: 200,
    headers: baseHeaders({ 'Content-Type': 'audio/mpeg' }),
  });
}
