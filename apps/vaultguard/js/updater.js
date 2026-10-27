const Updater = (() => {
  const KEY = 'vaultguard.updater';

  function state() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(KEY) : null;
      const s = raw ? Security.safeJsonParse(raw, {}) : {};
      return {
        currentVersion: Security.clampString(s.currentVersion, 40) || Signatures.VERSION,
        lastCheck: Security.clampInt(s.lastCheck, 0, Number.MAX_SAFE_INTEGER, 0),
        lastResult: Security.clampString(s.lastResult, 20) || 'never',
        pendingVersion: Security.clampString(s.pendingVersion, 40) || '',
        autoUpdate: s.autoUpdate !== false,
      };
    } catch (e) {
      return { currentVersion: Signatures.VERSION, lastCheck: 0, lastResult: 'never', pendingVersion: '', autoUpdate: true };
    }
  }

  function save(s) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function parseVersion(v) {
    const m = String(v || '').match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d+)$/);
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], n: +m[4], raw: v };
  }

  function compareVersions(a, b) {
    const pa = parseVersion(a), pb = parseVersion(b);
    if (!pa || !pb) return 0;
    if (pa.y !== pb.y) return pa.y - pb.y;
    if (pa.mo !== pb.mo) return pa.mo - pb.mo;
    if (pa.d !== pb.d) return pa.d - pb.d;
    return pa.n - pb.n;
  }

  function needsUpdate(manifest) {
    if (!manifest || typeof manifest !== 'object') return { update: false, reason: 'invalid manifest' };
    const v = Security.clampString(manifest.version, 40);
    if (!parseVersion(v)) return { update: false, reason: 'bad version format' };
    const cmp = compareVersions(v, state().currentVersion);
    return {
      update: cmp > 0,
      current: state().currentVersion,
      available: v,
      signatures: Security.clampInt(manifest.signatures, 0, 1000000, 0),
      sha256: Security.clampString(manifest.sha256, 64),
      cmp,
    };
  }

  function recordCheck(result) {
    const s = state();
    s.lastCheck = Date.now();
    s.lastResult = result === 'ok' ? 'ok' : (result === 'up-to-date' ? 'ok' : 'error');
    if (result === 'ok' && s.pendingVersion) {
      s.currentVersion = s.pendingVersion;
      s.pendingVersion = '';
    }
    save(s);
    return s;
  }

  function setAutoUpdate(on) {
    const s = state();
    s.autoUpdate = !!on;
    save(s);
    return s;
  }

  function stageUpdate(version) {
    const s = state();
    s.pendingVersion = Security.clampString(version, 40);
    save(s);
    return s;
  }

  function status() {
    return state();
  }

  return { parseVersion, compareVersions, needsUpdate, recordCheck, setAutoUpdate, stageUpdate, status };
})();
if (typeof window !== 'undefined') window.Updater = Updater;
if (typeof module !== 'undefined' && module.exports) module.exports = Updater;
