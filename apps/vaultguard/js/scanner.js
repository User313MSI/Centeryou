const Scanner = (() => {
  const SAMPLE_BYTES = 256 * 1024;

  const VERDICT = { CLEAN: 'clean', SUSPICIOUS: 'suspicious', INFECTED: 'infected', TEST: 'test' };
  const SEVERITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4, test: 0 };

  const HEX_CACHE = new Map();
  function cachedDecodeHex(hex) {
    let needle = HEX_CACHE.get(hex);
    if (needle === undefined) {
      needle = Signatures.decodeHex(hex);
      if (HEX_CACHE.size > 64) HEX_CACHE.clear();
      HEX_CACHE.set(hex, needle);
    }
    return needle;
  }

  function bytesToTextCached(bytes) {
    if (!bytes || !bytes.length) return '';
    const key = bytes.length + ':' + (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16)) + ':' + bytes[bytes.length - 1];
    let text = HEX_CACHE.get(key);
    if (text === undefined) {
      text = Signatures.bytesToLatin1(bytes);
      if (HEX_CACHE.size > 128) HEX_CACHE.clear();
      HEX_CACHE.set(key, text);
    }
    return text;
  }

  const CONFIDENCE = { CERTAIN: 'certain', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

  function classify(result) {
    const score = result.score;
    let verdict = VERDICT.CLEAN;
    if (result.testHit) verdict = VERDICT.TEST;
    else if (score >= 80) verdict = VERDICT.INFECTED;
    else if (score >= 40) verdict = VERDICT.SUSPICIOUS;
    return verdict;
  }

  function confidence(result) {
    if (result.testHit) return CONFIDENCE.CERTAIN;
    const sigCount = (result.signatures || []).length;
    if (result.verdict === VERDICT.INFECTED && sigCount >= 2) return CONFIDENCE.CERTAIN;
    if (result.verdict === VERDICT.INFECTED && sigCount === 1) return CONFIDENCE.HIGH;
    if (result.verdict === VERDICT.SUSPICIOUS && sigCount >= 2) return CONFIDENCE.HIGH;
    if (result.verdict === VERDICT.SUSPICIOUS) return CONFIDENCE.MEDIUM;
    return CONFIDENCE.LOW;
  }

  function maxSeverity(sev) {
    let cur = 'low';
    for (const s of sev) if (SEVERITY_ORDER[s] > SEVERITY_ORDER[cur]) cur = s;
    return cur;
  }

  const BEHAVIOR_RULES = [
    { id: 'BEH-DOUBLE-EXT', test: (name) => /\.(pdf|docx?|txt|jpg|png|zip|xlsx?)\.(exe|scr|bat|cmd|ps1|hta|lnk|vbs|js)$/i.test(name), weight: 45, label: 'double extension (document masking executable)' },
    { id: 'BEH-RIGHT-TO-LEFT', test: (name) => /\u202E/.test(name), weight: 50, label: 'right-to-left override character' },
    { id: 'BEH-UNICODE-HOMO', test: (name) => /[\u0400-\u04FF\u4E00-\u9FFF]/.test(name) && /\.(exe|scr|bat|cmd|ps1|hta)$/i.test(name), weight: 40, label: 'homoglyph in executable name' },
    { id: 'BEH-SPACES-EXE', test: (name) => /\.(exe|scr|bat|cmd|ps1|hta)\s+$/i.test(name) || /\s{3,}\.(exe|scr|bat|cmd|ps1|hta)$/i.test(name), weight: 35, label: 'padded executable extension' },
    { id: 'BEH-TEMP-EXEC', test: (name, path) => /\.(exe|scr|dll|bat|cmd|ps1|hta)$/i.test(name) && /(^|[\\/])(\.?tmp|temp|AppData[\\/]Local[\\/]Temp|Windows[\\/]Temp|Temporary Internet Files)([\\/]|$)/i.test(path || ''), weight: 50, label: 'executable dropped in temp folder' },
    { id: 'BEH-STARTUP-EXEC', test: (name, path) => /\.(exe|scr|bat|cmd|ps1|hta|vbs|lnk)$/i.test(name) && /(Start Menu|Startup|AppData[\\/]Roaming[\\/]Microsoft[\\/]Windows[\\/]Start Menu)([\\/]|$)/i.test(path || ''), weight: 55, label: 'executable in startup folder' },
    { id: 'BEH-RECYCLER', test: (name, path) => /(^|[\\/])(\$Recycle\.Bin|RECYCLER|System Volume Information)([\\/]|$)/i.test(path || ''), weight: 30, label: 'file in recycle/system folder' },
    { id: 'BEH-RECENT-LNK', test: (name, path) => /\.lnk$/i.test(name) && /(^|[\\/])Recent([\\/]|$)/i.test(path || ''), weight: 35, label: 'shortcut in Recent folder' },
    { id: 'BEH-MISMATCH-EXT', test: (name, path, bytes) => {
      if (!/\.(jpg|jpeg|png|gif|bmp|pdf|txt|csv|log|docx?|xlsx?|html?|xml|json)$/i.test(name)) return false;
      if (!bytes || bytes.length < 8) return false;
      const isMZ = bytes[0] === 0x4D && bytes[1] === 0x5A;
      const isELF = bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46;
      const isPE = bytes[0] === 0x50 && bytes[1] === 0x45 && bytes[2] === 0x00 && bytes[3] === 0x00;
      const isScript = bytes[0] === 0x23 && bytes[1] === 0x21;
      const isHTML = (bytes[0] === 0x3C);
      return isMZ || isELF || isPE || (isScript && !/\.(txt|csv|log|md)$/i.test(name)) || (isHTML && !/\.html?$/i.test(name));
    }, weight: 60, label: 'content/extension mismatch (binary disguised as document)' },
    { id: 'BEH-ZIP-BOMB-NAME', test: (name) => /\.(zip|rar|7z)$/i.test(name), weight: 5, label: 'archive (inspect with caution)' },
  ];

  function applyBehaviorRules(name, path, bytes) {
    const hits = [];
    for (const r of BEHAVIOR_RULES) {
      try {
        if (r.test(name, path, bytes)) hits.push(r);
      } catch (e) {}
    }
    return hits;
  }

  function analyzeBytes(name, bytes, size, path) {
    const safeName = Security.clampString(name, 200) || 'file';
    const safeSize = Security.clampInt(size, 0, Number.MAX_SAFE_INTEGER, 0);
    const safePath = Security.clampString(path || '');
    const result = {
      name: safeName,
      size: safeSize,
      score: 0,
      verdict: VERDICT.CLEAN,
      reasons: [],
      signatures: [],
      testHit: false,
      entropy: 0,
    };
    if (!bytes || !bytes.length) {
      result.reasons.push('empty file');
      result.score += 5;
      result.verdict = classify(result);
      return result;
    }

    const hexHits = Signatures.matchHexPatterns(bytes);
    for (const h of hexHits) {
      result.signatures.push(Security.clampString(h.id, 60));
      if (h.severity === 'test') {
        result.testHit = true;
        result.reasons.push('EICAR test signature matched');
        result.score = 100;
      } else {
        result.score += Security.clampInt(h.weight, 0, 100, 0);
        result.reasons.push(`signature ${h.id}: ${h.name}`);
      }
    }

    const textHits = Signatures.matchTextPatterns(bytes);
    for (const h of textHits) {
      result.signatures.push(Security.clampString(h.id, 60));
      result.score += Security.clampInt(h.weight, 0, 100, 0);
      result.reasons.push(`signature ${h.id}: ${h.name}`);
    }

    const nr = Signatures.nameRisk(safeName);
    if (nr > 0) {
      result.score += nr;
      result.reasons.push('suspicious file name');
    }

    const er = Signatures.extensionRisk(safeName);
    if (er > 0) {
      result.score += er;
      result.reasons.push(`executable extension ${Signatures.extOf(safeName)}`);
    }

    const behaviorHits = applyBehaviorRules(safeName, safePath, bytes);
    for (const b of behaviorHits) {
      result.score += Security.clampInt(b.weight, 0, 100, 0);
      result.signatures.push(Security.clampString(b.id, 60));
      result.reasons.push(`behavior: ${b.label}`);
    }

    const ent = Signatures.shannonEntropy(bytes);
    result.entropy = Math.round(ent * 100) / 100;
    const ext = Signatures.extOf(safeName);
    const isPacked = ent > 7.5 && safeSize > 64 * 1024 && !Signatures.SCRIPT_EXTS.includes(ext) && !Signatures.DOC_EXTS.includes(ext);
    if (isPacked) {
      result.score += 25;
      result.reasons.push(`high entropy (${result.entropy}) — possible packer/crypter`);
    }

    if (result.score > 100) result.score = 100;
    result.verdict = classify(result);
    result.confidence = confidence(result);
    return result;
  }

  function quickReject(name, size) {
    const ext = Signatures.extOf(name);
    if (size === 0) return true;
    if (!ext) return false;
    if (Signatures.ARCHIVE_EXTS.includes(ext)) return true;
    if (size > 64 * 1024 * 1024) return true;
    return false;
  }

  function summarize(results) {
    const summary = {
      total: results.length,
      clean: 0,
      suspicious: 0,
      infected: 0,
      test: 0,
      maxScore: 0,
      threats: [],
    };
    for (const r of results) {
      if (r.verdict === VERDICT.CLEAN) summary.clean++;
      else if (r.verdict === VERDICT.SUSPICIOUS) summary.suspicious++;
      else if (r.verdict === VERDICT.INFECTED) summary.infected++;
      else if (r.verdict === VERDICT.TEST) summary.test++;
      if (r.score > summary.maxScore) summary.maxScore = r.score;
      if (r.verdict !== VERDICT.CLEAN) {
        summary.threats.push({
          path: Security.clampString(r.path),
          name: Security.clampString(r.name, 200),
          verdict: r.verdict,
          score: Security.clampInt(r.score, 0, 100, 0),
          severity: r.testHit ? 'test' : maxSeverity(r.signatures.map((sig) => {
            const all = [...Signatures.TEXT_PATTERNS, ...Signatures.URL_PATTERNS, ...Signatures.MZ_CHECKS, ...Signatures.HEX_PATTERNS];
            const found = all.find((p) => p.id === sig);
            if (found && found.severity) return found.severity;
            return r.verdict === VERDICT.INFECTED ? 'high' : 'medium';
          })),
          reasons: r.reasons.slice(0, 5).map((x) => Security.clampString(x, 200)),
          signatures: r.signatures.slice(0, 10).map((s) => Security.clampString(s, 60)),
          size: Security.clampInt(r.size, 0, Number.MAX_SAFE_INTEGER, 0),
        });
      }
    }
    summary.risk = summary.infected * 3 + summary.suspicious * 1;
    return summary;
  }

  async function scanFile(fileMeta, readHead) {
    const meta = fileMeta || {};
    const safePath = Security.clampString(meta.path);
    const safeName = Security.clampString(meta.name, 200) || 'file';
    const safeSize = Security.clampInt(meta.size, 0, Number.MAX_SAFE_INTEGER, 0);
    if (!safePath || Security.hasNullByte(safePath)) {
      return { path: safePath, name: safeName, size: safeSize, score: 0, verdict: VERDICT.CLEAN, reasons: ['invalid path'], signatures: [], testHit: false, entropy: 0, error: true };
    }
    if (quickReject(safeName, safeSize)) {
      const r = analyzeBytes(safeName, new Uint8Array(0), safeSize, safePath);
      r.skipped = true;
      r.path = safePath;
      return r;
    }
    const bytes = await readHead(safePath, Math.min(Math.max(safeSize || 0, 4096), SAMPLE_BYTES));
    const r = analyzeBytes(safeName, bytes, safeSize || bytes.length, safePath);
    r.path = safePath;
    return r;
  }

  const PROGRESS_EVERY = 10;

  async function scanFiles(files, readHead, onProgress, opts = {}) {
    const results = [];
    const list = Array.isArray(files) ? files : [];
    const total = list.length;
    const o = Security.validateScanOptions(opts);
    const CONCURRENCY = Math.max(1, Math.min(o.concurrency, total || 1));
    let done = 0;
    let cursor = 0;
    let lastNotify = 0;

    async function worker() {
      while (cursor < total) {
        const i = cursor++;
        if (opts.isCancelled && opts.isCancelled()) break;
        const meta = list[i];
        const safeMeta = {
          path: Security.clampString(meta && meta.path),
          name: Security.clampString(meta && meta.name, 200) || 'file',
          size: Security.clampInt(meta && meta.size, 0, Number.MAX_SAFE_INTEGER, 0),
        };
        try {
          const r = await scanFile(safeMeta, readHead);
          results.push(r);
        } catch (e) {
          results.push({ path: safeMeta.path, name: safeMeta.name, size: safeMeta.size, score: 0, verdict: VERDICT.CLEAN, reasons: ['unreadable'], signatures: [], testHit: false, entropy: 0, error: true });
        }
        done++;
        const now = Date.now();
        if (onProgress && (done % PROGRESS_EVERY === 0 || now - lastNotify > 100)) {
          lastNotify = now;
          onProgress({ done, total, current: safeMeta.path });
        }
      }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);
    if (onProgress) onProgress({ done, total, finished: true });
    return { results, summary: summarize(results) };
  }

  return {
    SAMPLE_BYTES,
    VERDICT,
    CONFIDENCE,
    PROGRESS_EVERY,
    BEHAVIOR_RULES,
    classify,
    confidence,
    analyzeBytes,
    applyBehaviorRules,
    summarize,
    scanFile,
    scanFiles,
    quickReject,
    cachedDecodeHex,
    bytesToTextCached,
  };
})();
if (typeof window !== 'undefined') window.Scanner = Scanner;
if (typeof module !== 'undefined' && module.exports) module.exports = Scanner;
