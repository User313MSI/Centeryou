/*
 * FlowPlan — serveur statique local, zéro dépendance.
 * Durci : rejette les chemins hors racine (403), les méthodes non GET (405),
 * et pose des en-têtes de sécurité de base.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.PORT) || 8000;
const MAX_URL = 2048;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'",
};

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }
  let urlPath;
  try {
    if (req.url.length > MAX_URL) throw new Error('URL trop longue');
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400); res.end('Bad Request'); return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath.includes('\0')) { res.writeHead(400); res.end('Bad Request'); return; }
  const file = path.normalize(path.join(ROOT, urlPath));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    // no-store sur le HTML/JS/CSS : jamais de cache navigateur, chaque reload = code frais.
    // (évite qu'un ancien index.html reste servi après un git pull)
    const isCode = /\.(html|js|css|webmanifest)$/.test(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': isCode ? 'no-store, must-revalidate' : 'no-cache',
      ...SECURITY_HEADERS,
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('FlowPlan dispo sur http://localhost:' + PORT + ' (boucle locale uniquement)');
});
