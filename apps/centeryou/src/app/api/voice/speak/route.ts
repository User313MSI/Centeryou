import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

/**
 * POST /api/voice/speak { text }
 * Voix premium (ElevenLabs) servie par le serveur : la clé API reste côté
 * serveur (jamais dans le bundle navigateur) et le quota est celui du compte
 * serveur. Renvoie un flux audio (audio/mpeg). Sans clé configurée → 501,
 * le client bascule alors sur la voix du navigateur, sans erreur.
 */
export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? process.env.NEXT_ELEVENLABS_API_KEY ?? '';
  if (!apiKey) {
    return NextResponse.json({ error: 'Voix premium non configurée' }, { status: 501 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { text?: string };
    const text = body.text?.trim() ?? '';
    if (!text) return NextResponse.json({ error: 'text requis' }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: 'text trop long' }, { status: 400 });

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: `ElevenLabs HTTP ${res.status}` }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur voix premium' },
      { status: 500 },
    );
  }
}
