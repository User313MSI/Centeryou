const Quarantine = (() => {
  const MAX_ITEMS = 5000;

  function store() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('vaultguard.quarantine') : null;
      const arr = raw ? Security.safeJsonParse(raw, []) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function persist(items) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('vaultguard.quarantine', JSON.stringify(items));
    } catch (e) {}
  }

  function sanitizeName(name) {
    return Security.safeFileName(name).slice(0, 120);
  }

  function add(item) {
    const v = Security.validateQuarantineEntry(item);
    if (!v) return null;
    const items = store();
    const entry = {
      id: 'q' + Security.token(),
      name: v.name,
      originalPath: v.originalPath,
      threatName: v.threatName,
      verdict: v.verdict,
      score: v.score,
      size: v.size,
      quarantinedAt: Date.now(),
      dest: v.dest,
    };
    items.unshift(entry);
    if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    persist(items);
    return entry;
  }

  function list() {
    return store();
  }

  function remove(id) {
    const items = store();
    const next = items.filter((i) => i.id !== id);
    persist(next);
    return items.length !== next.length;
  }

  function clear() {
    persist([]);
  }

  function find(id) {
    return store().find((i) => i.id === id) || null;
  }

  return { add, list, remove, clear, find, sanitizeName, MAX_ITEMS };
})();
if (typeof window !== 'undefined') window.Quarantine = Quarantine;
if (typeof module !== 'undefined' && module.exports) module.exports = Quarantine;
