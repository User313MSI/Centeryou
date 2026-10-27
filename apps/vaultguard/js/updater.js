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

  const UPDATE_SECRET = 'novaloom-vaultguard-update-v1';

  function manifestPayload(m) {
    return ['VG-UPDATE', m.version, String(m.signatures), m.sha256, m.channel || 'stable', String(m.minAppVersion || '')].join('|');
  }

  function verifyManifest(manifest, opts = {}) {
    if (!Security.isPlainObject(manifest)) return { trusted: false, reason: 'invalid manifest' };
    const v = Security.clampString(manifest.version, 40);
    if (!parseVersion(v)) return { trusted: false, reason: 'bad version format' };
    const signatures = Security.clampInt(manifest.signatures, 0, 1000000, -1);
    if (signatures < 0) return { trusted: false, reason: 'bad signature count' };
    const sha256 = Security.clampString(manifest.sha256, 64).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sha256)) return { trusted: false, reason: 'bad payload hash' };
    const channel = ['stable', 'beta'].includes(manifest.channel) ? manifest.channel : 'stable';
    const minAppVersion = Security.clampString(manifest.minAppVersion, 40);
    if (minAppVersion && parseVersion(minAppVersion) && compareVersions(appVersion(), minAppVersion) < 0) {
      return { trusted: false, reason: 'app too old for this update' };
    }
    const sig = Security.clampString(manifest.sig, 64).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sig)) return { trusted: false, reason: 'missing signature' };
    const expected = Security.hmacSha256Hex(opts.secret || UPDATE_SECRET, manifestPayload({
      version: v, signatures, sha256, channel, minAppVersion,
    }));
    if (!Security.timingSafeEqualHex(sig, expected)) return { trusted: false, reason: 'signature mismatch — update channel compromised or tampered' };
    return { trusted: true, version: v, signatures, sha256, channel };
  }

  function appVersion() {
    const s = state();
    return s.currentVersion;
  }

  function needsUpdate(manifest, opts = {}) {
    if (!Security.isPlainObject(manifest)) return { update: false, reason: 'invalid manifest' };
    const verified = verifyManifest(manifest, opts);
    if (!verified.trusted) return { update: false, reason: verified.reason, trusted: false };
    const cmp = compareVersions(verified.version, state().currentVersion);
    return {
      update: cmp > 0,
      trusted: true,
      current: state().currentVersion,
      available: verified.version,
      signatures: verified.signatures,
      sha256: verified.sha256,
      channel: verified.channel,
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

  return { parseVersion, compareVersions, verifyManifest, needsUpdate, recordCheck, setAutoUpdate, stageUpdate, status, UPDATE_SECRET };
})();
if (typeof window !== 'undefined') window.Updater = Updater;
if (typeof module !== 'undefined' && module.exports) module.exports = Updater;
