import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let email: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.email === 'string') email = body.email;
  } catch {
    email = undefined;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (supabaseUrl && serviceKey && email) {
    const base = supabaseUrl.replace(/\/$/, '');
    const query = `?select=id&email=eq.${encodeURIComponent(email)}`;
    try {
      const res = await fetch(`${base}/rest/v1/comptes${query}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=representation',
        },
      });
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, serverDeleted: false, error: `supabase_http_${res.status}` },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, serverDeleted: true });
    } catch {
      return NextResponse.json(
        { ok: false, serverDeleted: false, error: 'supabase_unreachable' },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    serverDeleted: false,
    reason: supabaseUrl && serviceKey
      ? 'aucune adresse e-mail fournie : aucune donnée serveur identifiée'
      : 'aucun compte serveur configure a ce jour',
  });
}
