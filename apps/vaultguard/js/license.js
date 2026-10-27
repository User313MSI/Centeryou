const License = (() => {
  const KEY = 'vaultguard.license';
  const TRIAL_KEY = 'vaultguard.trial';
  const TRIAL_DAYS = 14;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const PAYLOAD_VERSION = 'v1';

  const PLANS = {
    PRO: { id: 'PRO', name: 'VaultGuard Pro', seats: 1, support: 'Priority email support' },
    TEAM: { id: 'TEAM', name: 'VaultGuard Team', seats: 10, support: 'Priority support, 10 seats' },
    BUSINESS: { id: 'BUSINESS', name: 'VaultGuard Business', seats: 50, support: '24/7 dedicated support, 50 seats' },
  };

  const FEATURES = {
    quickScan: 'Quick scan',
    fullScan: 'Full system scan',
    customScan: 'Custom folder scans',
    realtime: 'Real-time protection',
    ransomware: 'Ransomware shield',
    processMonitor: 'Process protection',
    networkMonitor: 'Network protection',
    bootGuard: 'Startup & persistence guard',
    scheduler: 'Scheduled scans',
    quarantine: 'Quarantine & repair',
    updates: 'Automatic updates',
  };

  function payloadFor(plan, expires, machineId) {
    return [PAYLOAD_VERSION, 'VG', plan, expires, machineId].join('|');
  }

  function sign(payload, secret) {
    return Security.hmacSha256Hex(secret || License.SECRET, payload).slice(0, 16);
  }

  function normalizeKey(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.toUpperCase().replace(/[\s-]/g, '');
    const m = cleaned.match(/^VG(PRO|TEAM|BUSINESS)(\d{8})([0-9A-F]{16})$/);
    if (!m) return null;
    return { plan: m[1], expires: m[2], sig: m[3].toLowerCase(), compact: cleaned };
  }

  function formatKey(parts) {
    const raw = 'VG' + parts.plan + parts.expires + parts.sig.toUpperCase();
    const groups = raw.match(/.{1,4}/g) || [];
    return groups.join('-');
  }

  function makeKey(opts) {
    const plan = PLANS[opts.plan] ? opts.plan : 'PRO';
    const expires = /^\d{8}$/.test(String(opts.expires)) ? String(opts.expires) : null;
    const machineId = Security.clampString(opts.machineId, 64);
    if (!expires || !machineId) return null;
    const payload = payloadFor(plan, expires, machineId);
    return formatKey({ plan, expires, sig: sign(payload, opts.secret) });
  }

  function expiresToMs(expires) {
    const y = +expires.slice(0, 4), mo = +expires.slice(4, 6), d = +expires.slice(6, 8);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return NaN;
    return Date.UTC(y, mo - 1, d, 23, 59, 59, 999);
  }

  function verifyKey(rawKey, machineId, opts = {}) {
    const now = opts.now !== undefined ? opts.now : Date.now();
    const secret = opts.secret || License.SECRET;
    const parts = normalizeKey(rawKey);
    if (!parts) return { valid: false, reason: 'malformed', message: 'This is not a valid VaultGuard license key.' };
    if (!PLANS[parts.plan]) return { valid: false, reason: 'malformed', message: 'Unknown plan in license key.' };
    const expected = sign(payloadFor(parts.plan, parts.expires, machineId), secret);
    if (!Security.timingSafeEqualHex(parts.sig, expected)) {
      return { valid: false, reason: 'bad-signature', message: 'License signature check failed. This key was not issued by NovaLoom or does not belong to this machine.' };
    }
    const expMs = expiresToMs(parts.expires);
    if (!Number.isFinite(expMs)) return { valid: false, reason: 'malformed', message: 'License expiry date is invalid.' };
    if (now > expMs) {
      return { valid: false, reason: 'expired', message: 'This license expired on ' + parts.expires.slice(0, 4) + '-' + parts.expires.slice(4, 6) + '-' + parts.expires.slice(6, 8) + '.', plan: parts.plan, expires: expMs };
    }
    return {
      valid: true,
      plan: parts.plan,
      planName: PLANS[parts.plan].name,
      expires: expMs,
      daysLeft: Math.max(0, Math.ceil((expMs - now) / DAY_MS)),
    };
  }

  function machineId() {
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : {};
      const scr = typeof screen !== 'undefined' ? screen : {};
      const raw = [
        nav.userAgent || '', nav.language || '', nav.languages ? nav.languages.join(',') : '',
        nav.hardwareConcurrency || '', nav.deviceMemory || '', nav.platform || '',
        scr.width || '', scr.height || '', scr.colorDepth || '',
        new Date().getTimezoneOffset(), (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      ].join('|');
      return 'M-' + Security.sha256Hex('vaultguard-machine|' + raw).slice(0, 24);
    } catch (e) {
      return 'M-unknown';
    }
  }

  function readStored() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(KEY) : null;
      const s = raw ? Security.safeJsonParse(raw, null) : null;
      if (!Security.isPlainObject(s)) return null;
      return {
        key: Security.clampString(s.key, 80),
        plan: Security.clampString(s.plan, 12),
        customer: Security.clampString(s.customer, 120),
        machineId: Security.clampString(s.machineId, 64),
        activatedAt: Security.clampInt(s.activatedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      };
    } catch (e) {
      return null;
    }
  }

  function writeStored(rec) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(rec));
    } catch (e) {}
  }

  function activate(rawKey, opts = {}) {
    const mid = opts.machineId || machineId();
    const v = verifyKey(rawKey, mid, opts);
    if (!v.valid) return v;
    writeStored({
      key: formatKey(normalizeKey(rawKey)),
      plan: v.plan,
      customer: Security.clampString(opts.customer, 120),
      machineId: mid,
      activatedAt: Date.now(),
    });
    return { ...v, activated: true, machineId: mid };
  }

  function deactivate() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function trialState(opts = {}) {
    const now = opts.now !== undefined ? opts.now : Date.now();
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(TRIAL_KEY) : null;
      let startedAt = raw ? Security.clampInt(Security.safeJsonParse(raw, {}).startedAt, 0, Number.MAX_SAFE_INTEGER, 0) : 0;
      if (!startedAt || startedAt > now) {
        startedAt = now;
        if (typeof localStorage !== 'undefined') localStorage.setItem(TRIAL_KEY, JSON.stringify({ startedAt }));
      }
      const endsAt = startedAt + TRIAL_DAYS * DAY_MS;
      const expired = now > endsAt;
      return {
        startedAt,
        endsAt,
        expired,
        active: !expired,
        daysLeft: expired ? 0 : Math.max(0, Math.ceil((endsAt - now) / DAY_MS)),
      };
    } catch (e) {
      return { startedAt: now, endsAt: now + TRIAL_DAYS * DAY_MS, expired: false, active: true, daysLeft: TRIAL_DAYS };
    }
  }

  function status(opts = {}) {
    const now = opts.now !== undefined ? opts.now : Date.now();
    const stored = readStored();
    if (stored && stored.key) {
      const v = verifyKey(stored.key, stored.machineId || machineId(), { ...opts, now });
      if (v.valid) {
        return { state: 'licensed', plan: v.plan, planName: v.planName, customer: stored.customer, daysLeft: v.daysLeft, expires: v.expires, key: stored.key };
      }
      return { state: 'invalid-license', reason: v.reason, message: v.message, plan: stored.plan, customer: stored.customer, key: stored.key };
    }
    const trial = trialState({ now });
    if (trial.active) {
      return { state: 'trial', trial, daysLeft: trial.daysLeft, endsAt: trial.endsAt };
    }
    return { state: 'expired', trial };
  }

  function canUse(feature, st) {
    if (!FEATURES[feature]) return { allowed: false, reason: 'Unknown feature' };
    if (!st) st = status();
    if (st.state === 'licensed' || st.state === 'trial') return { allowed: true };
    if (st.state === 'invalid-license') return { allowed: false, reason: 'Your license is invalid. Reactivate VaultGuard to continue using ' + FEATURES[feature] + '.', upgrade: false };
    return { allowed: false, reason: 'Your trial has ended. Activate a license to continue using ' + FEATURES[feature] + '.', upgrade: true };
  }

  function fmtDate(ms) {
    if (!Number.isFinite(ms)) return '—';
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
  }

  return {
    SECRET: 'novaloom-vaultguard-license-v1',
    TRIAL_DAYS,
    PLANS,
    FEATURES,
    normalizeKey,
    formatKey,
    makeKey,
    verifyKey,
    machineId,
    activate,
    deactivate,
    trialState,
    status,
    canUse,
    fmtDate,
  };
})();
if (typeof window !== 'undefined') window.License = License;
if (typeof module !== 'undefined' && module.exports) module.exports = License;
