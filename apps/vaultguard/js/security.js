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
  };
})();
if (typeof window !== 'undefined') window.Security = Security;
if (typeof module !== 'undefined' && module.exports) module.exports = Security;
