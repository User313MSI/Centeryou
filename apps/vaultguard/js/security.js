const Security = (() => {
  const MAX_STRING = 4096;

  function clampString(v, max = MAX_STRING) {
    return typeof v === 'string' ? v.slice(0, max) : '';
  }

  function clampInt(v, min, max, fallback = 0) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, min), max);
  }

  function isPlainObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  function hasNullByte(s) {
    return typeof s === 'string' && s.indexOf('\0') !== -1;
  }

  function sanitizePath(p) {
    if (typeof p !== 'string') return null;
    if (p.length === 0 || p.length > MAX_STRING) return null;
    if (hasNullByte(p)) return null;
    return p;
  }

  function looksLikeTraversal(p) {
    if (typeof p !== 'string') return true;
    const parts = p.split(/[\\/]/);
    return parts.includes('..');
  }

  function safeFileName(name) {
    return clampString(name, 200)
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/^\.+/, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'file';
  }

  function token() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
  }

  function deepFreeze(value) {
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) deepFreeze(value[k]);
      Object.freeze(value);
    }
    return value;
  }

  function safeJsonParse(raw, fallback = null) {
    try {
      const v = JSON.parse(raw);
      return v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function validateScanOptions(opts) {
    if (!isPlainObject(opts)) return { maxFiles: 20000, maxDepth: 12 };
    return {
      maxFiles: clampInt(opts.maxFiles, 1, 200000, 20000),
      maxDepth: clampInt(opts.maxDepth, 1, 24, 12),
      concurrency: clampInt(opts.concurrency, 1, 64, 8),
      bytes: clampInt(opts.bytes, 16, 1024 * 1024, 256 * 1024),
    };
  }

  function validateQuarantineEntry(entry) {
    if (!isPlainObject(entry)) return null;
    if (typeof entry.name !== 'string' || entry.name.trim() === '') return null;
    const name = safeFileName(entry.name);
    return {
      name,
      originalPath: clampString(entry.originalPath),
      threatName: clampString(entry.threatName, 120) || 'Unknown',
      verdict: ['clean', 'suspicious', 'infected', 'test'].includes(entry.verdict) ? entry.verdict : 'suspicious',
      score: clampInt(entry.score, 0, 100, 0),
      size: clampInt(entry.size, 0, Number.MAX_SAFE_INTEGER, 0),
      dest: clampString(entry.dest),
    };
  }

  function rateLimiter(maxCalls, windowMs) {
    const calls = [];
    return function allow() {
      const now = Date.now();
      while (calls.length && now - calls[0] > windowMs) calls.shift();
      if (calls.length >= maxCalls) return false;
      calls.push(now);
      return true;
    };
  }

  function redactPath(p) {
    const s = clampString(p, 300);
    const home = (typeof process !== 'undefined' && process.env && process.env.HOME) || '';
    if (home && s.startsWith(home)) return '~' + s.slice(home.length);
    return s;
  }

  // --- Pure-JS SHA-256 / HMAC-SHA256 (browser, Electron renderer and Node sandbox) ---
  const SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const c2 = str.charCodeAt(++i);
        c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return new Uint8Array(out);
  }

  function sha256Bytes(data) {
    let bytes = data;
    if (typeof bytes === 'string') bytes = utf8Bytes(bytes);
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes || []);
    const bitLen = bytes.length * 8;
    const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6;
    const msg = new Uint8Array(paddedLen);
    msg.set(bytes);
    msg[bytes.length] = 0x80;
    const dv = new DataView(msg.buffer);
    dv.setUint32(paddedLen - 4, bitLen >>> 0, false);
    dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = new Uint32Array(64);
    for (let off = 0; off < paddedLen; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    const out = new Uint8Array(32);
    const odv = new DataView(out.buffer);
    const hs = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (let i = 0; i < 8; i++) odv.setUint32(i * 4, hs[i], false);
    return out;
  }

  function bytesToHex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += (bytes[i] >>> 4).toString(16) + (bytes[i] & 15).toString(16);
    return s;
  }

  function sha256Hex(data) {
    return bytesToHex(sha256Bytes(data));
  }

  function hmacSha256(keyBytes, message) {
    let key = keyBytes;
    if (typeof key === 'string') key = utf8Bytes(key);
    if (!(key instanceof Uint8Array)) key = new Uint8Array(key || []);
    if (key.length > 64) key = sha256Bytes(key);
    const ipad = new Uint8Array(64).fill(0x36);
    const opad = new Uint8Array(64).fill(0x5c);
    for (let i = 0; i < key.length; i++) { ipad[i] ^= key[i]; opad[i] ^= key[i]; }
    const msgBytes = typeof message === 'string' ? utf8Bytes(message) : new Uint8Array(message || []);
    const inner = new Uint8Array(64 + msgBytes.length);
    inner.set(ipad, 0);
    inner.set(msgBytes, 64);
    const innerHash = sha256Bytes(inner);
    const outer = new Uint8Array(96);
    outer.set(opad, 0);
    outer.set(innerHash, 64);
    return sha256Bytes(outer);
  }

  function hmacSha256Hex(key, message) {
    return bytesToHex(hmacSha256(key, message));
  }

  function timingSafeEqualHex(a, b) {
    const sa = typeof a === 'string' ? a.toLowerCase() : '';
    const sb = typeof b === 'string' ? b.toLowerCase() : '';
    if (sa.length !== sb.length || sa.length === 0) return false;
    let diff = 0;
    for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
    return diff === 0;
  }

  return {
    MAX_STRING,
    clampString,
    clampInt,
    isPlainObject,
    hasNullByte,
    sanitizePath,
    looksLikeTraversal,
    safeFileName,
    token,
    deepFreeze,
    safeJsonParse,
    validateScanOptions,
    validateQuarantineEntry,
    rateLimiter,
    redactPath,
    sha256Bytes,
    sha256Hex,
    hmacSha256,
    hmacSha256Hex,
    timingSafeEqualHex,
    utf8Bytes,
    bytesToHex,
  };
})();
if (typeof window !== 'undefined') window.Security = Security;
if (typeof module !== 'undefined' && module.exports) module.exports = Security;
