import { NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_ELEVENLABS_API_KEY ?? process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? '';
const VOICE_ID =
  process.env.NEXT_ELEVENLABS_VOICE_ID ?? process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
const MODEL = 'eleven_multilingual_v2';
const MAX_TEXT = 5000;

export async function POST(req: Request) {
  if (!API_KEY) return new NextResponse(null, { status: 204 });
  let text = '';
  try {
    const body = await req.json();
    text = String(body?.text ?? '').slice(0, MAX_TEXT);
  } catch {
    return new NextResponse('Requête invalide', { status: 400 });
  }
  if (!text.trim()) return new NextResponse(null, { status: 204 });
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) return new NextResponse(null, { status: 502 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
