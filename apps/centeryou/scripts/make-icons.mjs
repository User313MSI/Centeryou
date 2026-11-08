/**
 * Génère les assets PWA de Centeryou (icônes PNG 192/512, apple-touch-icon,
 * icon.svg, manifest.webmanifest) UNIQUEMENT à partir de design/tokens.ts :
 * aucune couleur en dur dans ce script ni dans les sources.
 *
 * Usage : npm run icons   (zéro dépendance, PNG encodé via node:zlib)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const tokensSrc = readFileSync(path.join(appRoot, 'design/tokens.ts'), 'utf8');

function tokenColor(name) {
  const m = tokensSrc.match(new RegExp(`${name}:\\s*'(#[0-9a-fA-F]{6})'`));
  if (!m) throw new Error(`Token couleur « ${name} » introuvable dans design/tokens.ts`);
  return m[1];
}

const PRIMARY = tokenColor('primary');
const VOICE = tokenColor('voice');
const BG = tokenColor('bg');

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// ---------- encodeur PNG minimal (RGBA 8 bits, zlib) ----------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filtre none
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ---------- rendu du logo (cercle violet + onde teal), supersampling 4x ----------
function renderLogo(size, { opaqueBg = false } = {}) {
  const S = 4;
  const w = size * S;
  const h = size * S;
  const [pr, pg, pb] = hexToRgb(PRIMARY);
  const [vr, vg, vb] = hexToRgb(VOICE);
  const [br, bgl, bb] = hexToRgb(BG);
  const cx = w / 2;
  const cy = h / 2;
  const R = w * 0.46;
  const x0 = cx - R * 0.72;
  const x1 = cx + R * 0.72;
  const amp = R * 0.3;
  const stroke = R * 0.1;
  const px = new Uint8Array(w * h * 4);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      let r = br;
      let g = bgl;
      let b = bb;
      let a = opaqueBg ? 255 : 0;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= R) {
        r = pr;
        g = pg;
        b = pb;
        a = 255;
        if (x >= x0 && x <= x1) {
          const phase = ((x - x0) / (x1 - x0)) * 2 * Math.PI;
          const yc = cy + amp * Math.sin(phase);
          if (Math.abs(y - yc) <= stroke / 2) {
            r = vr;
            g = vg;
            b = vb;
          }
        }
      }
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  }

  // downsample 4x -> size x size
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < S; dy += 1) {
        for (let dx = 0; dx < S; dx += 1) {
          const si = ((y * S + dy) * w + (x * S + dx)) * 4;
          r += px[si];
          g += px[si + 1];
          b += px[si + 2];
          a += px[si + 3];
        }
      }
      const n = S * S;
      const oi = (y * size + x) * 4;
      out[oi] = Math.round(r / n);
      out[oi + 1] = Math.round(g / n);
      out[oi + 2] = Math.round(b / n);
      out[oi + 3] = Math.round(a / n);
    }
  }
  return out;
}

// ---------- génération ----------
const iconsDir = path.join(appRoot, 'public/icons');
mkdirSync(iconsDir, { recursive: true });

const svg = `<!-- Généré par scripts/make-icons.mjs depuis design/tokens.ts — ne pas éditer à la main -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="240" fill="${PRIMARY}"/>
  <path d="M92 256 q41 -62 82 0 t82 0 t82 0 t82 0" fill="none" stroke="${VOICE}" stroke-width="26" stroke-linecap="round"/>
</svg>
`;

writeFileSync(path.join(iconsDir, 'icon.svg'), svg);
writeFileSync(path.join(iconsDir, 'icon-192.png'), encodePNG(192, 192, renderLogo(192)));
writeFileSync(path.join(iconsDir, 'icon-512.png'), encodePNG(512, 512, renderLogo(512)));
writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), encodePNG(180, 180, renderLogo(180, { opaqueBg: true })));

const manifest = {
  name: 'Centeryou — planning, tâches & voix',
  short_name: 'Centeryou',
  description:
    "Ton agenda, tes tâches et ton assistant vocal personnel, 100 % en français. Données locales uniquement.",
  lang: 'fr',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: PRIMARY,
  background_color: BG,
  icons: [
    { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
writeFileSync(path.join(appRoot, 'public/manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log('✅ Assets PWA générés depuis design/tokens.ts :');
console.log('   public/icons/icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png');
console.log('   public/manifest.webmanifest');
