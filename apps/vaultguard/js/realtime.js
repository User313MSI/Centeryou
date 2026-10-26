const Realtime = (() => {
  const WATCH_INTERVAL_MS = 4000;
  const MAX_EVENTS = 500;

  function createMonitor(deps) {
    const state = {
      enabled: false,
      watchedDirs: [],
      events: [],
      scanned: 0,
      threatsFound: 0,
      timer: null,
      snapshot: new Map(),
      listeners: [],
    };

    function notify() {
      state.listeners.forEach((cb) => cb(state));
    }

    function onChange(cb) {
      state.listeners.push(cb);
      return () => { state.listeners = state.listeners.filter((l) => l !== cb); };
    }

    const MAX_WATCHED = 50;

    function addWatch(dir) {
      const d = Security.clampString(dir);
      if (!d || Security.hasNullByte(d)) return false;
      if (state.watchedDirs.length >= MAX_WATCHED) return false;
      if (!state.watchedDirs.includes(d)) {
        state.watchedDirs.push(d);
        notify();
      }
      return true;
    }

    function removeWatch(dir) {
      state.watchedDirs = state.watchedDirs.filter((d) => d !== dir);
      notify();
    }

    function recordEvent(evt) {
      state.events.unshift(evt);
      if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
      if (evt.kind !== 'clean') state.threatsFound++;
      notify();
    }

    const TICK_BUDGET_MS = 2500;

    async function tick() {
      if (!state.enabled || !state.watchedDirs.length) return;
      const tickStart = Date.now();
      for (const dir of state.watchedDirs) {
        if (Date.now() - tickStart >= TICK_BUDGET_MS) break;
        let res;
        try {
          res = await deps.listFiles(dir, 5000, 4);
        } catch (e) {
          continue;
        }
        if (state.events.length > MAX_EVENTS * 2) state.events.length = MAX_EVENTS;
        if (!res || !res.ok || !Array.isArray(res.files)) continue;
        const seen = new Set();
        for (const f of res.files) {
          if (!f || typeof f.path !== 'string' || f.path.length === 0 || f.path.length > 4096) continue;
          if (typeof f.mtimeMs !== 'number' || !Number.isFinite(f.mtimeMs)) continue;
          const fname = typeof f.name === 'string' ? f.name : f.path.split(/[\\/]/).pop();
          seen.add(f.path);
          const prev = state.snapshot.get(f.path);
          if (prev === undefined) {
            state.snapshot.set(f.path, f.mtimeMs);
            state.scanned++;
            const ext = (fname.includes('.') ? fname.slice(fname.lastIndexOf('.')) : '').toLowerCase();
            if (deps.riskExt && deps.riskExt(ext) > 0) {
              recordEvent({ ts: Date.now(), kind: 'new-executable', path: f.path, name: fname, severity: 'high' });
            } else {
              recordEvent({ ts: Date.now(), kind: 'new', path: f.path, name: fname, severity: 'info' });
            }
          } else if (prev !== f.mtimeMs) {
            state.snapshot.set(f.path, f.mtimeMs);
            state.scanned++;
            const ext = (fname.includes('.') ? fname.slice(fname.lastIndexOf('.')) : '').toLowerCase();
            const risky = deps.riskExt && deps.riskExt(ext) > 0;
            recordEvent({ ts: Date.now(), kind: risky ? 'modified-executable' : 'modified', path: f.path, name: fname, severity: risky ? 'high' : 'medium' });
          }
        }
        for (const p of [...state.snapshot.keys()]) {
          if (!seen.has(p) && p.startsWith(dir)) {
            state.snapshot.delete(p);
            state.scanned++;
            recordEvent({ ts: Date.now(), kind: 'deleted', path: p, name: p.split(/[\\/]/).pop(), severity: 'info' });
          }
        }
      }
    }

    function start() {
      if (state.enabled) return false;
      state.enabled = true;
      state.timer = setInterval(tick, WATCH_INTERVAL_MS);
      if (typeof state.timer.unref === 'function') state.timer.unref();
      notify();
      return true;
    }

    function stop() {
      state.enabled = false;
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      notify();
    }

    function status() {
      return {
        enabled: state.enabled,
        watchedDirs: [...state.watchedDirs],
        scanned: state.scanned,
        threatsFound: state.threatsFound,
        eventCount: state.events.length,
      };
    }

    return { state, onChange, addWatch, removeWatch, start, stop, status, tick, recordEvent, TICK_BUDGET_MS };
  }

  return { WATCH_INTERVAL_MS, MAX_EVENTS, createMonitor };
})();
if (typeof window !== 'undefined') window.Realtime = Realtime;
if (typeof module !== 'undefined' && module.exports) module.exports = Realtime;
