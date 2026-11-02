/*
 * FlowPlan — génère les icônes PNG (180, 192, 512) en pur Node (zlib intégré).
 * Usage : node scripts/make-icons.js
 * Dessine la même identité que assets/icon.svg : fond sombre arrondi,
 * cadre bleu, pastille violette, barre bleue.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function roundRect(x, y, w, h, r, px, py) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const cx = Math.max(x + r, Math.min(px, w - r - 1));
  const cy = Math.max(y + r, Math.min(py, h - r - 1));
  return (px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r;
}

function render(size) {
  const s = size;
  const data = Buffer.alloc(s * s * 4);
  const u = s / 512; // unité : l'icône est dessinée sur une grille 512
  const bg = [16, 20, 24];
  const blue = [79, 156, 255];
  const purple = [124, 92, 255];
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      let c = bg;
      if (roundRect(0, 0, 512, 512, 110, x / u, y / u)) {
        // cadre calendrier (stroke 18 sur grille 512)
        const inFrame = roundRect(90, 90, 332, 332, 36, x / u, y / u) && !roundRect(108, 108, 296, 296, 24, x / u, y / u);
        const barH = y / u >= 206 - 7 && y / u <= 206 + 7 && x / u >= 90 && x / u <= 422;
        const barV = x / u >= 256 - 7 && x / u <= 256 + 7 && y / u >= 90 && y / u <= 422;
        if (inFrame || barH || (barV && x / u > 90 && x / u < 422)) c = blue;
        // pastille violette (173,306 r26)
        const dx = x / u - 173, dy = y / u - 306;
        if (dx * dx + dy * dy <= 26 * 26) c = purple;
        // barre bleue (286,286 96x40 rx12)
        if (roundRect(286, 286, 96, 40, 12, x / u, y / u)) c = blue;
      }
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
  }
  const raw = Buffer.alloc(s * (s * 4 + 1));
  for (let y = 0; y < s; y++) {
    raw[y * (s * 4 + 1)] = 0;
    data.copy(raw, y * (s * 4 + 1) + 1, y * s * 4, (y + 1) * s * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0); ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [180, 192, 512]) {
  const file = path.join(outDir, 'icon-' + size + '.png');
  fs.writeFileSync(file, render(size));
  console.log('écrit', file, fs.statSync(file).size, 'octets');
}
