const Exclusions = (() => {
  const KEY = 'vaultguard.exclusions';

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
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(items.slice(0, 500)));
    } catch (e) {}
  }

  function normalize(entry) {
    if (typeof entry !== 'string') return null;
    let e = entry.trim();
    if (!e || e.length > 1024) return null;
    if (e.startsWith('glob:')) e = e.slice(5);
    return e;
  }

  function add(entry) {
    const e = normalize(entry);
    if (!e) return false;
    const items = load();
    if (!items.includes(e)) {
      items.push(e);
      save(items);
    }
    return true;
  }

  function remove(entry) {
    const items = load();
    const next = items.filter((i) => i !== entry);
    save(next);
    return next.length !== items.length;
  }

  function list() {
    return load();
  }

  function globToRegex(glob) {
    let re = '';
    for (let i = 0; i < glob.length; i++) {
      const c = glob[i];
      if (c === '*') re += '[^\\/]*';
      else if (c === '?') re += '[^\\/]';
      else if (c === '.') re += '\\.';
      else if ('\\^$+{}[]|()'.includes(c)) re += '\\' + c;
      else re += c;
    }
    return new RegExp('^' + re + '$', 'i');
  }

  function matches(path, name, items) {
    if (!items || !items.length) return false;
    const p = String(path || '');
    const n = String(name || '');
    const haystacks = [p, n, p.toLowerCase(), n.toLowerCase()];
    for (const item of items) {
      const it = String(item);
      if (it.includes('*') || it.includes('?')) {
        let re;
        try { re = globToRegex(it); } catch (e) { continue; }
        for (const h of haystacks) if (re.test(h)) return true;
      } else {
        const low = it.toLowerCase();
        for (const h of haystacks) if (h === low || h.endsWith(low) || h.includes(low)) return true;
      }
    }
    return false;
  }

  function isExcluded(path, name) {
    return matches(path, name, load());
  }

  function clear() {
    save([]);
  }

  return { add, remove, list, clear, isExcluded, matches, globToRegex, normalize };
})();
if (typeof window !== 'undefined') window.Exclusions = Exclusions;
if (typeof module !== 'undefined' && module.exports) module.exports = Exclusions;
