const Shield = (() => {
  const HISTORY_KEY = 'vaultguard.history';
  const MAX_HISTORY = 200;

  let historyCache = null;
  let historyCacheAt = 0;
  const CACHE_TTL_MS = 2000;

  function loadHistory() {
    const now = Date.now();
    if (historyCache && now - historyCacheAt < CACHE_TTL_MS) return historyCache;
    let arr = [];
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(HISTORY_KEY) : null;
      arr = raw ? Security.safeJsonParse(raw, []) : [];
      if (!Array.isArray(arr)) arr = [];
    } catch (e) {
      arr = [];
    }
    historyCache = arr;
    historyCacheAt = now;
    return arr;
  }

  function invalidateCache() {
    historyCache = null;
    historyCacheAt = 0;
  }

  function saveHistory(items) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }

  function addScanRecord(record) {
    const r = Security.isPlainObject(record) ? record : {};
    const items = loadHistory();
    items.unshift({
      id: 's' + Security.token(),
      ts: Date.now(),
      type: Security.clampString(r.type, 20) || 'quick',
      targets: Array.isArray(r.targets) ? r.targets.filter((t) => typeof t === 'string' && t.length > 0).map((t) => Security.clampString(t)).slice(0, 50) : [],
      scanned: Security.clampInt(r.scanned, 0, Number.MAX_SAFE_INTEGER, 0),
      threats: Security.clampInt(r.threats, 0, Number.MAX_SAFE_INTEGER, 0),
      durationMs: Math.round(Security.clampInt(r.durationMs, 0, Number.MAX_SAFE_INTEGER, 0)),
      signatureVersion: Security.clampString(r.signatureVersion, 40) || 'unknown',
    });
    saveHistory(items);
    invalidateCache();
    return items[0];
  }

  function history() {
    return loadHistory();
  }

  function clearHistory() {
    saveHistory([]);
    invalidateCache();
  }

  function healthScore(summary, monitorStatus) {
    const s = summary || {};
    const hadScan = (s.total || 0) > 0 || (s.infected || 0) > 0 || (s.suspicious || 0) > 0 || (s.clean || 0) > 0;
    let score = 100;
    score -= Math.min(50, (s.infected || 0) * 15);
    score -= Math.min(25, (s.suspicious || 0) * 4);
    score -= Math.min(10, (s.test || 0) * 2);
    const q = (typeof Quarantine !== 'undefined') ? Quarantine.list().length : 0;
    score -= Math.min(10, q * 2);
    if (!monitorStatus || !monitorStatus.enabled) score -= 10;
    const last = loadHistory()[0];
    if (last) {
      const ageH = (Date.now() - last.ts) / 3600000;
      if (ageH > 168) score -= 10;
      else if (ageH > 24) score -= 4;
    } else if (hadScan) {
      score -= 5;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function healthLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Poor';
    return 'Critical';
  }

  return { addScanRecord, history, clearHistory, healthScore, healthLabel, MAX_HISTORY };
})();
if (typeof window !== 'undefined') window.Shield = Shield;
if (typeof module !== 'undefined' && module.exports) module.exports = Shield;
