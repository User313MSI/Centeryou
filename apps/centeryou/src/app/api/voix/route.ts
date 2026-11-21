import { NextRequest, NextResponse } from 'next/server';

import { verifySessionUser } from '../../../lib/server/auth';

import { json, unknownFields } from '../../../lib/server/http';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

const DAILY_CHAR_LIMIT = 300;
const MAX_TEXT_LENGTH = 1000;
// Plafond anti-abus par adresse IP, en plus du quota par profil ci-dessous.
const RATE_LIMIT_PER_HOUR = 20;
/**
 * M-13 Verrou — plafonds globaux par IP PLUS STRICTS que le quota par profil :
 * un attaquant qui fait tourner les prénoms (`x-centeryou-user`) depuis une
 * même adresse reste borné à 100 requêtes/jour et 3 000 caractères/jour au
 * total (contre 20 × 300 = 6 000 car/heure auparavant).
 */
const RATE_LIMIT_PER_DAY = 100;
const DAILY_CHAR_LIMIT_PER_IP = 3_000;
/** Corps minuscule attendu ({ text }) : 16 Ko max, 413 au-delà. */
const MAX_BODY_BYTES = 16 * 1024;

const ELEVENLABS_API_KEY = process.env.NEXT_ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? '';

const ELEVENLABS_VOICE_ID =
  process.env.NEXT_ELEVENLABS_VOICE_ID ?? process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';

const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

const usageByDay = new Map<string, { day: string; used: number }>();

const rateByIp = new Map<string, { hour: string; count: number }>();

const rateByIpDay = new Map<string, { day: string; count: number }>();

const charsByIpDay = new Map<string, { day: string; used: number }>();

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

function pruneDay<T extends { day: string }>(map: Map<string, T>, day: string, maxSize: number): void {
  if (map.size < maxSize) return;
  map.forEach((v, k) => {
    if (v.day !== day) map.delete(k);
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

function pruneUsage(day: string): void {
  pruneDay(usageByDay, day, 500);
}

/**
 * Compteur journalier de requêtes par IP. Renvoie la réponse 429 si le
 * plafond journalier est atteint, sinon null (et incrémente).
 */
function dailyRequestCap(ip: string): NextResponse | null {
  const day = todayKey();
  pruneDay(rateByIpDay, day, 1000);
  const key = `${day}:${ip}`;
  const entry = rateByIpDay.get(key) ?? { day, count: 0 };
  if (entry.day !== day) {
    entry.day = day;
    entry.count = 0;
  }
  if (entry.count >= RATE_LIMIT_PER_DAY) {
    const retryAfter = Math.max(1, Math.ceil((86_400_000 - (Date.now() % 86_400_000)) / 1000));
    return NextResponse.json(
      {
        ok: false,
        reason: 'rate-limit-day',
        limit: RATE_LIMIT_PER_DAY,
        remaining: 0,
        retryAfter,
        message: `Plafond journalier atteint depuis cette adresse (${RATE_LIMIT_PER_DAY} appels par jour). Réessaie demain — la voix de ton navigateur reste disponible.`,
      },
      { status: 429, headers: { ...baseHeaders(), 'Retry-After': String(retryAfter) } },
    );
  }
  entry.count += 1;
  rateByIpDay.set(key, entry);
  return null;
}

/** Caractères consommés aujourd'hui depuis cette IP (plafond global anti-rotation de prénoms). */
function ipCharsUsed(ip: string): { entry: { day: string; used: number }; key: string } {
  const day = todayKey();
  pruneDay(charsByIpDay, day, 1000);
  const key = `${day}:${ip}`;
  const entry = charsByIpDay.get(key) ?? { day, used: 0 };
  if (entry.day !== day) {
    entry.day = day;
    entry.used = 0;
  }
  return { entry, key };
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

  // 1bis) Plafond journalier par IP, encore plus strict (M-13).
  const daily = dailyRequestCap(ip);
  if (daily) return daily;

  if (!ELEVENLABS_API_KEY) {
    return json(
      { ok: false, reason: 'not-configured', message: 'Voix premium non configurée côté serveur.' },
      503,
    );
  }

  // 2) Corps plafonné (413) puis JSON strict (400) — M-13.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ ok: false, reason: 'bad-request', message: 'Corps de requête illisible.' }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, reason: 'too-large', message: 'Corps de requête trop volumineux.' }, 413);
  }
  let text: unknown;
  try {
    const body: unknown = JSON.parse(raw || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ ok: false, reason: 'bad-request', message: 'Corps de requête JSON invalide.' }, 400);
    }
    if (unknownFields(body as Record<string, unknown>, ['text']).length > 0) {
      return json({ ok: false, reason: 'bad-request', message: 'Champ inattendu dans la requête.' }, 400);
    }
    text = (body as { text?: unknown }).text;
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

  // 3) Profil : en-tête contrôlé par le client, nettoyé (caractères de contrôle
  //    retirés, 60 car max) — M-13.
  const user = (req.headers.get('x-centeryou-user') ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 60);
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

  // 3bis) M-13 : dès qu'une session Supabase existe (Bearer valide vérifié côté
  // serveur), l'identité de session PRIME sur le prénom : un attaquant ne peut
  // plus multiplier les quotas en faisant tourner `x-centeryou-user`.
  const sessionUser = await verifySessionUser(req);

  const day = todayKey();
  pruneUsage(day);
  const quotaKey = sessionUser ? `${day}:session:${sessionUser.id}` : `${day}:${user.toLowerCase()}`;
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

  // 3ter) M-13 : plafond global de caractères par IP et par jour, indépendant
  // du prénom présenté.
  const ipChars = ipCharsUsed(ip);
  const remainingIp = Math.max(0, DAILY_CHAR_LIMIT_PER_IP - ipChars.entry.used);
  if (text.length > remainingIp) {
    return json(
      {
        ok: false,
        reason: 'quota-ip',
        limit: DAILY_CHAR_LIMIT_PER_IP,
        remaining: remainingIp,
        message: `Plafond de voix atteint pour aujourd'hui depuis cette adresse (${DAILY_CHAR_LIMIT_PER_IP} caractères par jour au total). La voix de ton navigateur prend le relais.`,
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
  ipChars.entry.used += text.length;
  charsByIpDay.set(ipChars.key, ipChars.entry);

  return new NextResponse(new Uint8Array(audio), {
    status: 200,
    headers: baseHeaders({ 'Content-Type': 'audio/mpeg' }),
  });
}
