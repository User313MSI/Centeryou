import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPng = path.join(root, 'assets', 'icon-512.png');
const outDir = path.join(root, 'build');
const outIco = path.join(outDir, 'icon.ico');
const outPng = path.join(outDir, 'icon.png');

function decodePng(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error('Fichier PNG invalide (signature)');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`PNG non supporté (bitDepth=${bitDepth}, colorType=${colorType}) : attendu RGBA 8 bits`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) {
        throw new Error(`Filtre PNG inconnu : ${filter}`);
      }
      cur[x] = v & 0xff;
    }
    prev = Buffer.from(cur);
  }
  return { width, height, data: out };
}

function downscale(data, w, h, s) {
  const out = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const x0 = Math.floor((x * w) / s);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / s));
      const y0 = Math.floor((y * h) / s);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / s));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const p = (yy * w + xx) * 4;
          r += data[p];
          g += data[p + 1];
          b += data[p + 2];
          a += data[p + 3];
          n++;
        }
      }
      const q = (y * s + x) * 4;
      out[q] = Math.round(r / n);
      out[q + 1] = Math.round(g / n);
      out[q + 2] = Math.round(b / n);
      out[q + 3] = Math.round(a / n);
    }
  }
  return out;
}

function bmpEntry(rgba, size) {
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = ((size - 1 - y) * size + x) * 4;
      const dst = (y * size + x) * 4;
      xor[dst] = rgba[src + 2];
      xor[dst + 1] = rgba[src + 1];
      xor[dst + 2] = rgba[src];
      xor[dst + 3] = rgba[src + 3];
    }
  }
  const andRow = Math.ceil(size / 32) * 4;
  const and = Buffer.alloc(andRow * size);
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(xor.length + and.length, 20);
  return Buffer.concat([header, xor, and]);
}

const png = fs.readFileSync(srcPng);
const { width, height, data } = decodePng(png);
if (width !== 512 || height !== 512) {
  throw new Error(`assets/icon-512.png doit faire 512x512 (reçu ${width}x${height})`);
}

fs.mkdirSync(outDir, { recursive: true });

const sizes = [256, 128, 64, 48, 32, 16];
const images = sizes.map((s) => bmpEntry(downscale(data, width, height, s), s));
const dir = Buffer.alloc(6 + 16 * images.length);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
images.forEach((img, i) => {
  const s = sizes[i];
  const e = 6 + 16 * i;
  dir.writeUInt8(s === 256 ? 0 : s, e);
  dir.writeUInt8(s === 256 ? 0 : s, e + 1);
  dir.writeUInt8(0, e + 2);
  dir.writeUInt8(0, e + 3);
  dir.writeUInt16LE(1, e + 4);
  dir.writeUInt16LE(32, e + 6);
  dir.writeUInt32LE(img.length, e + 8);
  dir.writeUInt32LE(offset, e + 12);
  offset += img.length;
});
fs.writeFileSync(outIco, Buffer.concat([dir, ...images]));
fs.copyFileSync(srcPng, outPng);
console.log(`OK  build/icon.ico (${sizes.join(', ')} px) + build/icon.png (512 px) générés depuis assets/icon-512.png`);
