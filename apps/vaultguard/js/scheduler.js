const Scheduler = (() => {
  const KEY = 'vaultguard.scheduler';
  const MAX_JOBS = 20;

  const INTERVALS = { hourly: 3600000, daily: 86400000, weekly: 604800000 };

  function load() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(KEY) : null;
      const arr = raw ? Security.safeJsonParse(raw, []) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_JOBS)));
    } catch (e) {}
  }

  function addJob(job) {
    if (!job || typeof job !== 'object') return null;
    const interval = INTERVALS[Security.clampString(job.interval, 20)] || INTERVALS.daily;
    const items = load();
    const entry = {
      id: 'j' + Security.token(),
      name: Security.clampString(job.name, 100) || 'Scheduled scan',
      type: Security.clampString(job.type, 20) === 'quick' ? 'quick' : 'custom',
      targets: Array.isArray(job.targets) ? job.targets.filter((t) => typeof t === 'string').map((t) => Security.clampString(t)).slice(0, 50) : [],
      interval,
      enabled: job.enabled !== false,
      lastRun: 0,
      nextRun: Date.now() + interval,
      createdAt: Date.now(),
    };
    items.push(entry);
    save(items);
    return load().find((j) => j.id === entry.id) || entry;
  }

  function setNextRun(id, nextRun) {
    const items = load();
    const j = items.find((x) => x.id === id);
    if (!j) return false;
    j.nextRun = Security.clampInt(nextRun, 0, Number.MAX_SAFE_INTEGER, Date.now());
    save(items);
    return true;
  }

  function removeJob(id) {
    const items = load();
    const next = items.filter((j) => j.id !== id);
    save(next);
    return next.length !== items.length;
  }

  function toggleJob(id, enabled) {
    const items = load();
    const j = items.find((x) => x.id === id);
    if (!j) return false;
    j.enabled = !!enabled;
    if (j.enabled && j.nextRun < Date.now()) j.nextRun = Date.now() + j.interval;
    save(items);
    return true;
  }

  function list() {
    return load();
  }

  function dueJobs(now) {
    const t = now || Date.now();
    return load().filter((j) => j.enabled && j.nextRun <= t);
  }

  function markRun(id, now) {
    const items = load();
    const j = items.find((x) => x.id === id);
    if (!j) return false;
    j.lastRun = now || Date.now();
    j.nextRun = j.lastRun + j.interval;
    save(items);
    return true;
  }

  function nextRunLabel(job, now) {
    const t = now || Date.now();
    const diff = Math.max(0, job.nextRun - t);
    if (!job.enabled) return 'paused';
    if (diff < 60000) return 'due now';
    if (diff < 3600000) return 'in ' + Math.round(diff / 60000) + ' min';
    if (diff < 86400000) return 'in ' + Math.round(diff / 3600000) + ' h';
    return 'in ' + Math.round(diff / 86400000) + ' d';
  }

  return { INTERVALS, MAX_JOBS, addJob, removeJob, toggleJob, setNextRun, list, dueJobs, markRun, nextRunLabel };
})();
if (typeof window !== 'undefined') window.Scheduler = Scheduler;
if (typeof module !== 'undefined' && module.exports) module.exports = Scheduler;
