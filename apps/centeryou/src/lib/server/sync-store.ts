/**
 * Stockage des snapshots de synchronisation multi-appareils (offre Premium),
 * indexés par customer Stripe.
 *
 * Si Vercel KV est configuré (KV_REST_API_URL + KV_REST_API_TOKEN), le snapshot
 * est persistant et partagé entre appareils. Sinon (dev local), repli en mémoire
 * — la synchro reste fonctionnelle en local, sans rien casser.
 */

export interface SyncSnapshot {
  customerId: string;
  updatedAt: number;
  state: unknown;
}

const memory = new Map<string, SyncSnapshot>();

const kvUrl = process.env.KV_REST_API_URL ?? '';
const kvToken = process.env.KV_REST_API_TOKEN ?? '';
const kvEnabled = kvUrl.length > 0 && kvToken.length > 0;

function key(customerId: string): string {
  return `centeryou:sync:${customerId}`;
}

async function kvCommand(path: string, args: string[]): Promise<unknown> {
  const res = await fetch(`${kvUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`KV HTTP ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data.result;
}

export async function getSnapshot(customerId: string): Promise<SyncSnapshot | null> {
  if (kvEnabled) {
    try {
      const raw = (await kvCommand('', ['GET', key(customerId)])) as string | null;
      if (!raw) return null;
      return JSON.parse(raw) as SyncSnapshot;
    } catch {
      return memory.get(customerId) ?? null;
    }
  }
  return memory.get(customerId) ?? null;
}

export async function putSnapshot(snap: SyncSnapshot): Promise<void> {
  memory.set(snap.customerId, snap);
  if (kvEnabled) {
    try {
      await kvCommand('', ['SET', key(snap.customerId), JSON.stringify(snap)]);
    } catch {
      // repli mémoire déjà effectué — la synchro dégrade, ne casse pas
    }
  }
}
