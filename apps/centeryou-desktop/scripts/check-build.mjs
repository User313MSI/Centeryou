import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD_URL = process.env.CENTERYOU_URL || 'https://dev-apps-centeryou.vercel.app';
const outFile = path.join(root, 'build-info.json');

async function fetchBuildId() {
  const res = await fetch(PROD_URL, {
    headers: { 'user-agent': 'centeryou-desktop/check-build', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${PROD_URL}`);
  const headerId = res.headers.get('x-vercel-id');
  const html = await res.text();
  const match = html.match(/"buildId":"([^"]+)"/);
  return headerId || (match && match[1]) || null;
}

try {
  const buildId = await fetchBuildId();
  const info = { url: PROD_URL, buildId, checkedAt: new Date().toISOString() };
  fs.writeFileSync(outFile, JSON.stringify(info, null, 2) + '\n');
  console.log(`OK  build-info.json : buildId=${buildId} (${PROD_URL})`);
} catch (err) {
  console.warn(`Hors ligne ou URL injoignable (${err.message}) : build-info.json existant conservé.`);
  if (!fs.existsSync(outFile)) {
    fs.writeFileSync(
      outFile,
      JSON.stringify({ url: PROD_URL, buildId: null, checkedAt: null }, null, 2) + '\n'
    );
  }
  process.exitCode = 0;
}
