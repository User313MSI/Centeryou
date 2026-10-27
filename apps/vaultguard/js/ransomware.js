const RansomGuard = (() => {
  const MAX_EVENTS = 2000;
  const CRYPTO_EXTS = ['.locked', '.encrypted', '.enc', '.crypt', '.crypto', '.crypted', '.wannacry', '.wncry', '.wcry', '.zepto', '.locky', '.cerber', '.odin', '.aes', '.RSA4096', '.pay', '.payransom', '.wannadecryptor', '.xtbl', '.sage', '.ryuk', '.conti', '.hive', '.blackcat', '.lockbit', '.royal', '.alphv', '.black Basta'.replace(' ', '')];
  const NOTE_NAMES = ['readme', 'how_to_decrypt', 'how to decrypt', 'decrypt_instructions', 'restore_files', 'read_me', 'help_decrypt', 'important_read', '!!!readme!!!', 'how_to_back_files', 'recover_instructions'];
  const NOTE_EXTS = ['.txt', '.html', '.hta', '.md'];
  const BURST_THRESHOLD = 20;
  const BURST_WINDOW_MS = 10000;

  function createGuard() {
    const state = {
      enabled: true,
      events: [],
      renames: [],
      notes: [],
      burstCount: 0,
      burstStart: 0,
      tripped: false,
      protectedDirs: [],
      listeners: [],
    };

    function notify() {
      state.listeners.forEach((cb) => cb(state));
    }

    function onChange(cb) {
      state.listeners.push(cb);
      return () => { state.listeners = state.listeners.filter((l) => l !== cb); };
    }

    function isCryptoExt(name) {
      const low = String(name || '').toLowerCase();
      return CRYPTO_EXTS.some((e) => low.endsWith(e));
    }

    function isRansomNote(name) {
      const low = String(name || '').toLowerCase();
      const base = low.replace(/\.(txt|html?|hta|md)$/i, '');
      return NOTE_NAMES.some((n) => base === n || base.startsWith(n + '.') || base.startsWith(n + '_') || base.includes(n.replace(' ', '_')));
    }

    function recordRename(ev) {
      const e = {
        ts: Date.now(),
        kind: 'rename',
        path: Security.clampString(ev.path),
        name: Security.clampString(ev.name),
        toCrypto: isCryptoExt(ev.newName || ev.name),
      };
      state.events.unshift(e);
      if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
      state.renames.push(e);
      if (e.toCrypto) checkBurst();
      notify();
      return e;
    }

    function recordNewFile(ev) {
      const name = Security.clampString(ev.name);
      const e = { ts: Date.now(), kind: 'new', path: Security.clampString(ev.path), name };
      state.events.unshift(e);
      if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
      if (isRansomNote(name)) {
        state.notes.push(e);
        state.tripped = true;
        notify();
      }
      return e;
    }

    function checkBurst() {
      const now = Date.now();
      if (now - state.burstStart > BURST_WINDOW_MS) {
        state.burstStart = now;
        state.burstCount = 0;
      }
      state.burstCount++;
      if (state.burstCount >= BURST_THRESHOLD) {
        state.tripped = true;
        notify();
        return true;
      }
      return false;
    }

    function assess(evts) {
      const arr = Array.isArray(evts) ? evts : state.events;
      const cryptoRenames = arr.filter((e) => e.kind === 'rename' && e.toCrypto).length;
      const notes = arr.filter((e) => e.kind === 'new' && isRansomNote(e.name)).length;
      let risk = 'clean';
      let score = 0;
      if (cryptoRenames >= 50 || notes >= 2) { risk = 'critical'; score = 100; }
      else if (cryptoRenames >= BURST_THRESHOLD || notes >= 1) { risk = 'high'; score = 80; }
      else if (cryptoRenames >= 5) { risk = 'medium'; score = 50; }
      else if (cryptoRenames > 0) { risk = 'low'; score = 25; }
      return { risk, score, cryptoRenames, notes, tripped: state.tripped };
    }

    function addProtectedDir(dir) {
      const d = Security.clampString(dir);
      if (d && !state.protectedDirs.includes(d) && state.protectedDirs.length < 50) {
        state.protectedDirs.push(d);
        notify();
        return true;
      }
      return false;
    }

    function status() {
      return {
        enabled: state.enabled,
        tripped: state.tripped,
        eventCount: state.events.length,
        cryptoRenames: state.renames.filter((e) => e.toCrypto).length,
        notesFound: state.notes.length,
        protectedDirs: [...state.protectedDirs],
        assessment: assess(),
      };
    }

    function reset() {
      state.events = [];
      state.renames = [];
      state.notes = [];
      state.burstCount = 0;
      state.tripped = false;
      notify();
    }

    return { state, onChange, recordRename, recordNewFile, assess, addProtectedDir, status, reset, isCryptoExt, isRansomNote };
  }

  return { CRYPTO_EXTS, NOTE_NAMES, BURST_THRESHOLD, BURST_WINDOW_MS, createGuard, isCryptoExt: (n) => CRYPTO_EXTS.some((e) => String(n || '').toLowerCase().endsWith(e)) };
})();
if (typeof window !== 'undefined') window.RansomGuard = RansomGuard;
if (typeof module !== 'undefined' && module.exports) module.exports = RansomGuard;
