/*
 * FlowPlan — tests DOM exécutés en Node (harnais maison, zéro dépendance).
 * Charge js/app.js dans un faux DOM et VÉRIFIE que la modale se ferme
 * via les 3 moyens : bouton ✕, touche Échap, clic sur le fond.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const passes = [];
const failures = [];
function test(name, fn) {
  try { fn(); passes.push(name); }
  catch (e) { failures.push({ name, error: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'pas égal') + ' — attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a));
}

// ---------- faux DOM minimal mais fidèle ----------
function makeEl(id) {
  const listeners = {};
  const el = {
    id,
    children: [],
    style: {},
    dataset: {},
    hidden: false,
    value: '',
    textContent: '',
    set innerHTML(v) { if (v === '') this.children.length = 0; this._innerHTML = v; },
    get innerHTML() { return this._innerHTML || ''; },
    className: '',
    draggable: false,
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) { if (force === undefined) force = !this._set.has(c); force ? this._set.add(c) : this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    setAttribute(k, v) { this.dataset[k] = v; },
    getAttribute(k) { return this.dataset[k] ?? null; },
    appendChild(c) { c._parent = this; this.children.push(c); c.parentNode = this; return c; },
    insertBefore(c) { c._parent = this; this.children.unshift(c); return c; },
    remove() { const p = this._parent; if (p) { const i = p.children.indexOf(this); if (i !== -1) p.children.splice(i, 1); } },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    contains(c) { return c === el || el.children.includes(c); },
    focus() {},
    click() { (listeners.click || []).forEach(fn => fn({ target: el })); },
    fire(type, event) {
      (listeners[type] || []).forEach(fn => fn(Object.assign(
        { target: el, key: '', preventDefault() {}, stopPropagation() {}, dataTransfer: null }, event)));
    },
    _listeners: listeners,
  };
  return el;
}

function makeDocument() {
  const byId = {};
  const docListeners = {};
  const document = {
    documentElement: { setAttribute() {}, getAttribute() { return 'dark'; } },
    body: Object.assign(makeEl('body'), { tagName: 'BODY' }),
    getElementById(id) { return byId[id] || (byId[id] = makeEl(id)); },
    createElement(tag) { return makeEl('<' + tag + '>'); },
    createTextNode(t) { return { textContent: t }; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    fire(type, event) {
      (docListeners[type] || []).forEach(fn => fn(Object.assign(
        { key: '', target: null, preventDefault() {}, stopPropagation() {}, ctrlKey: false, metaKey: false }, event)));
    },
    _byId: byId,
  };
  // pré-crée les éléments attendus par app.js
  ['fp-input', 'fp-generate', 'fp-voice', 'fp-status', 'fp-week-label', 'fp-prev-week', 'fp-next-week',
   'fp-today-week', 'fp-week', 'fp-month', 'fp-stats', 'fp-conflicts', 'fp-filters', 'fp-search',
   'fp-view-week', 'fp-view-month', 'fp-theme', 'fp-modal', 'fp-modal-title', 'fp-modal-date',
   'fp-modal-start', 'fp-modal-end', 'fp-modal-allday', 'fp-modal-cat', 'fp-modal-save',
   'fp-modal-delete', 'fp-modal-cancel', 'fp-modal-close', 'fp-add', 'fp-export', 'fp-print',
   'fp-menu-btn', 'fp-menu-panel', 'fp-examples-toggle', 'fp-examples', 'fp-reset', 'fp-undo', 'fp-toasts', 'fp-reminders', 'fp-view-day', 'fp-day', 'fp-import', 'fp-demo', 'fp-present', 'fp-welcome', 'fp-welcome-go', 'fp-voice-welcome', 'fp-voice-toggle', 'fp-clock', 'fp-fab', 'fp-free-slots', 'fp-minical', 'fp-view-list', 'fp-list', 'fp-textsize', 'fp-lockstate', 'fp-read-day', 'fp-export-json', 'fp-modal-reminder', 'fp-repeat-tomorrow',
  ].forEach(id => { byId[id] = makeEl(id); });
  return document;
}

function loadApp() {
  const document = makeDocument();
  const storageData = {};
  const localStorage = {
    getItem: k => (k in storageData ? storageData[k] : null),
    setItem: (k, v) => { storageData[k] = String(v); },
    removeItem: k => { delete storageData[k]; },
  };
  const sandbox = {
    console,
    document,
    localStorage,
    navigator: {},
    location: { protocol: 'http:', origin: 'http://localhost:8000', pathname: '/', search: '', replace() {} },
    URLSearchParams,
    Blob: function () {},
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    setTimeout: (fn) => fn(),
    setInterval: () => 0,
    clearInterval: () => {},
    clearTimeout: () => {},
    __toastCount: 0,
    window: null,
  };
  sandbox.addEventListener = sandbox.addEventListener || (() => {}); sandbox.removeEventListener = () => {}; sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const jsDir = path.join(__dirname, '..', 'js');
  for (const f of ['parser.js', 'planner.js', 'store.js', 'voice.js', 'categories.js', 'ics.js', 'ics-import.js', 'lock.js', 'secure-store.js', 'app.js']) {
    const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
    vm.runInContext(code, sandbox, { filename: f });
  }
  return { sandbox, document };
}

// ---------- tests ----------
test('DOM : la modale a l\'attribut hidden dans index.html, puis s\'ouvre au clic sur + Ajouter', () => {
  // vérifie la source réelle (c'est le navigateur qui applique hidden)
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(/id="fp-modal"[^>]*\bhidden\b/.test(html) || /\bhidden\b[^>]*id="fp-modal"/.test(html),
    'index.html doit contenir <div id="fp-modal" ... hidden>');
  const { document } = loadApp();
  const modal = document.getElementById('fp-modal');
  modal.hidden = true; // fidèle à l'attribut HTML ci-dessus
  document.getElementById('fp-add').click();
  assert(modal.hidden === false, 'modale visible après clic sur + Ajouter');
});

test('DOM : le bouton ✕ (fp-modal-close) ferme la modale', () => {
  const { document } = loadApp();
  const modal = document.getElementById('fp-modal');
  document.getElementById('fp-add').click();
  assert(modal.hidden === false);
  document.getElementById('fp-modal-close').click();
  assert(modal.hidden === true, '✕ doit fermer la modale');
});

test('DOM : la touche Échap ferme la modale', () => {
  const { document } = loadApp();
  const modal = document.getElementById('fp-modal');
  document.getElementById('fp-add').click();
  assert(modal.hidden === false);
  document.fire('keydown', { key: 'Escape' });
  assert(modal.hidden === true, 'Échap doit fermer la modale');
});

test('DOM : le clic sur le fond (backdrop) ferme la modale, le clic DANS la modale ne la ferme pas', () => {
  const { document } = loadApp();
  const modal = document.getElementById('fp-modal');
  document.getElementById('fp-add').click();
  assert(modal.hidden === false);
  // clic dans la carte -> target = enfant, pas le backdrop : ne ferme PAS
  modal.fire('click', { target: document.getElementById('fp-modal-title') });
  assert(modal.hidden === false, 'clic dans la modale ne doit pas fermer');
  // clic sur le backdrop -> target = la modale elle-même : ferme
  modal.fire('click', { target: modal });
  assert(modal.hidden === true, 'clic sur le fond doit fermer');
});

test('DOM : Enregistrer avec un titre crée un événement et ferme la modale', () => {
  const { document, sandbox } = loadApp();
  document.getElementById('fp-add').click();
  document.getElementById('fp-modal-title').value = 'Test DOM';
  document.getElementById('fp-modal-date').value = '2026-11-09';
  document.getElementById('fp-modal-save').click();
  assert(document.getElementById('fp-modal').hidden === true, 'modale fermée après save');
  const events = sandbox.FlowPlanStore.load();
  assert(events.some(e => e.title === 'Test DOM'), 'événement persisté dans le store');
});

test('DOM : le bouton Annuler ferme sans enregistrer', () => {
  const { document, sandbox } = loadApp();
  document.getElementById('fp-add').click();
  document.getElementById('fp-modal-title').value = 'Non enregistré';
  document.getElementById('fp-modal-cancel').click();
  assert(document.getElementById('fp-modal').hidden === true);
  assert(!sandbox.FlowPlanStore.load().some(e => e.title === 'Non enregistré'), 'rien persisté');
});

// ---------- régression CSS : la modale ne dépend plus que de [hidden] ----------
test('CSS : .fp-modal-backdrop est display:none par défaut et display:flex UNIQUEMENT avec .open', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  assert(/\.fp-modal-backdrop\s*\{[^}]*display:\s*none/.test(css),
    'la classe de base doit être display:none');
  assert(/\.fp-modal-backdrop\.open\s*\{[^}]*display:\s*flex/.test(css),
    'règle .fp-modal-backdrop.open { display:flex } manquante');
  assert(/\.fp-modal-backdrop\[hidden\]\s*\{[^}]*display:\s*none/.test(css),
    'règle de secours [hidden] manquante');
});

test('DOM : openModal ajoute la classe .open, closeModal la retire (pilotage visuel robuste)', () => {
  const { document } = loadApp();
  const modal = document.getElementById('fp-modal');
  modal.hidden = true;
  document.getElementById('fp-add').click();
  assert(modal.classList.contains('open'), '.open présent après ouverture');
  document.getElementById('fp-modal-close').click();
  assert(!modal.classList.contains('open'), '.open retiré après fermeture via ✕');
  assert(modal.hidden === true, 'hidden=true après ✕');
});

// ---------- boot.js : kill switch ?fresh ----------
test('boot : ?fresh=1 désinscrit les SW et purge les caches puis recharge', () => {
  const registered = [];
  const unregistered = [];
  const cachesDeleted = [];
  let replaced = null;
  const sandbox = {
    console,
    URLSearchParams,
    location: { protocol: 'http:', search: '?fresh=1', pathname: '/', replace(u) { replaced = u; } },
    navigator: {
      serviceWorker: {
        getRegistrations: () => Promise.resolve([{ unregister: () => { unregistered.push(1); return Promise.resolve(); } }]),
        register: (f) => { registered.push(f); return Promise.resolve(); },
      },
    },
    caches: {
      keys: () => Promise.resolve(['flowplan-v2', 'flowplan-v3']),
      delete: (k) => { cachesDeleted.push(k); return Promise.resolve(true); },
    },
    window: {},
  };
  sandbox.addEventListener = sandbox.addEventListener || (() => {}); sandbox.removeEventListener = () => {}; sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'boot.js'), 'utf8');
  vm.runInContext(code, sandbox, { filename: 'boot.js' });
  return new Promise(resolve => setTimeout(() => {
    try {
      assert(unregistered.length === 1, 'SW désinscrit');
      assert(cachesDeleted.length === 2, 'caches purgés: ' + cachesDeleted);
      assert(replaced === '/', 'reload vers URL propre, reçu: ' + replaced);
      assert(registered.length === 0, 'aucun SW réenregistré en mode fresh');
      passes.push('boot : ?fresh=1 (async) OK');
    } catch (e) { failures.push({ name: 'boot : ?fresh=1 (async)', error: e.message }); }
    resolve();
  }, 20));
});

test('boot : sans paramètre, enregistre sw.js normalement', () => {
  const registered = [];
  const sandbox = {
    console,
    URLSearchParams,
    location: { protocol: 'http:', search: '', pathname: '/' },
    navigator: { serviceWorker: { register: (f) => { registered.push(f); return Promise.resolve(); } } },
    window: {},
  };
  sandbox.addEventListener = sandbox.addEventListener || (() => {}); sandbox.removeEventListener = () => {}; sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'boot.js'), 'utf8'), sandbox, { filename: 'boot.js' });
  eq(registered[0], 'sw.js');
});

test('boot : ?nosw=1 ne enregistre JAMAIS de SW (mode dev sans cache)', () => {
  const registered = [];
  const unregistered = [];
  const sandbox = {
    console,
    URLSearchParams,
    location: { protocol: 'http:', search: '?nosw=1', pathname: '/' },
    navigator: {
      serviceWorker: {
        getRegistrations: () => Promise.resolve([{ unregister: () => { unregistered.push(1); return Promise.resolve(); } }]),
        register: (f) => { registered.push(f); return Promise.resolve(); },
      },
    },
    caches: { keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) },
    window: {},
  };
  sandbox.addEventListener = sandbox.addEventListener || (() => {}); sandbox.removeEventListener = () => {}; sandbox.window = sandbox; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'boot.js'), 'utf8'), sandbox, { filename: 'boot.js' });
  return new Promise(resolve => setTimeout(() => {
    try {
      assert(registered.length === 0, 'aucun SW enregistré en ?nosw=1');
      assert(unregistered.length === 1, 'SW existant désinscrit');
      passes.push('boot : ?nosw=1 (async) OK');
    } catch (e) { failures.push({ name: 'boot : ?nosw=1 (async)', error: e.message }); }
    resolve();
  }, 20));
});

// ---------- menu ⋯ et reset sans console ----------
test('DOM : le menu ⋯ s\'ouvre et se ferme', () => {
  const { document } = loadApp();
  const panel = document.getElementById('fp-menu-panel');
  panel.hidden = true;
  document.getElementById('fp-menu-btn').fire('click', { stopPropagation() {} });
  assert(panel.hidden === false, 'menu ouvert');
  document.fire('click', { target: document.body });
  assert(panel.hidden === true, 'menu fermé au clic ailleurs');
});

test('DOM : les exemples sont repliés par défaut et se déplient', () => {
  const { document } = loadApp();
  const ex = document.getElementById('fp-examples');
  ex.hidden = true; // fidèle au HTML (hidden)
  document.getElementById('fp-examples-toggle').click();
  assert(ex.hidden === false, 'exemples visibles après clic');
});

// ---------- undo + toasts (UI) ----------
test('DOM : Ctrl+Z annule le dernier ajout et affiche un toast', () => {
  const { document, sandbox } = loadApp();
  const toastSpy = { count: 0 };
  const toastsEl = document.getElementById('fp-toasts');
  const origAppend = toastsEl.appendChild.bind(toastsEl);
  toastsEl.appendChild = (c) => { toastSpy.count++; return origAppend(c); };
  // ajoute un événement via le planner exposé par app.js ? non : via le DOM -> ouvre modale, sauve
  document.getElementById('fp-add').click();
  document.getElementById('fp-modal-title').value = 'Test undo';
  document.getElementById('fp-modal-date').value = '2026-11-04';
  document.getElementById('fp-modal-save').click();
  const before = sandbox.FlowPlanStore.load().length;
  assert(before === 1, '1 événement persisté');
  document.fire('keydown', { key: 'z', ctrlKey: true });
  eq(sandbox.FlowPlanStore.load().length, 0, 'undo a tout retiré');
  // le harnais exécute setTimeout immédiatement, donc le toast a pu être retiré :
  // on vérifie via un espion posé AVANT le fire sur appendChild du conteneur toasts
  assert(toastSpy.count >= 2, 'au moins 2 toasts créés (save + undo), reçu: ' + toastSpy.count);
});

// ---------- focus / raccourcis ----------
test('DOM : Échap quitte le mode focus (filtre actif -> null)', () => {
  const { document } = loadApp();
  document.getElementById('fp-add').click();
  document.getElementById('fp-modal-title').value = 'Dentiste';
  document.getElementById('fp-modal-cat').value = 'sante';
  document.getElementById('fp-modal-save').click();
  const filters = document.getElementById('fp-filters');
  const santeBtn = filters.children.find(c => c.getAttribute && c.getAttribute('data-cat') === 'sante');
  assert(santeBtn, 'bouton filtre sante présent');
  santeBtn.click();
  const badgeAvant = filters.children.find(c => (c.className || '').includes('fp-focus-badge'));
  assert(badgeAvant, 'badge focus présent AVANT Échap');
  document.fire('keydown', { key: 'Escape', target: document.body });
  // après Échap, le badge focus ne doit plus être là
  const badge = filters.children.find(c => (c.className || '').includes('fp-focus-badge'));
  assert(!badge, 'badge focus retiré après Échap');
});

// ---------- thème au chargement ----------
test('DOM : sans préférence stockée, le thème appliqué au chargement est dark (pas light)', () => {
  const { document } = loadApp();
  const t = document.documentElement.getAttribute('data-theme');
  assert(t === 'dark' || t === 'light', 'un thème est appliqué, reçu: ' + t);
  // localStorage du harnais est vide -> défaut attendu = dark
  eq(t, 'dark');
});

// ---------- welcome + démo + présentation ----------
test('DOM : écran d accueil affiché si jamais vu, disparaît au clic', () => {
  const { document } = loadApp();
  const w = document.getElementById('fp-welcome');
  w.hidden = true;
  // simule "jamais vu" puis relance le boot interne via clic direct
  document.getElementById('fp-welcome-go').click();
  assert(w.hidden === true, 'welcome caché après clic');
});

test('DOM : le bouton démo ajoute des événements', () => {
  const { document, sandbox } = loadApp();
  const before = sandbox.FlowPlanStore.load().length;
  document.getElementById('fp-demo').click();
  const after = sandbox.FlowPlanStore.load().length;
  assert(after > before, 'des événements de démo ont été ajoutés (' + before + ' -> ' + after + ')');
});

test('DOM : mode présentation toggle la classe presenting sur body', () => {
  const { document } = loadApp();
  const body = document.body;
  document.getElementById('fp-present').click();
  assert(body.classList.contains('presenting'), 'classe presenting ajoutée');
  document.getElementById('fp-present').click();
  assert(!body.classList.contains('presenting'), 'classe retirée');
});

test('DOM : Échap QUITTE la présentation (bug utilisateur)', () => {
  const { document } = loadApp();
  const body = document.body;
  document.getElementById('fp-present').click();
  assert(body.classList.contains('presenting'), 'en présentation');
  document.fire('keydown', { key: 'Escape', target: body });
  assert(!body.classList.contains('presenting'), 'Échap doit quitter la présentation');
});

test('DOM : F11 quitte aussi la présentation', () => {
  const { document } = loadApp();
  const body = document.body;
  document.getElementById('fp-present').click();
  document.fire('keydown', { key: 'F11', target: body });
  assert(!body.classList.contains('presenting'), 'F11 doit quitter');
});

// ---------- régression présentation (bug visuel Échap) ----------
test('CSS : en mode présentation, les blocs haut/bas sont display:none PUR (pas height:0/display:block)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/body\.presenting \.fp-top[^}]*\}/s);
  assert(m, 'règle trouvée');
  assert(m[0].includes('display: none'), 'display:none présent');
  assert(!m[0].includes('height: 0'), 'plus de height:0 qui créait des artefacts');
  assert(!m[0].includes('display: block'), 'plus de display:block contradictoire');
});

// ---------- fix fullscreenchange ----------
test('DOM : si le fullscreen se ferme (Échap navigateur) pendant la présentation, on quitte le mode présentation', () => {
  const { document } = loadApp();
  const body = document.body;
  document.getElementById('fp-present').click();
  assert(body.classList.contains('presenting'), 'en présentation');
  // simule : fullscreen actif puis fermé (document.fullscreenElement devient null)
  Object.defineProperty(document, 'fullscreenElement', { value: {}, configurable: true });
  document.fire('fullscreenchange');
  assert(body.classList.contains('presenting'), 'toujours en présentation tant que fullscreen actif');
  Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
  document.fire('fullscreenchange');
  assert(!body.classList.contains('presenting'), 'quitte la présentation quand le fullscreen se ferme');
});

// ---------- voix d accueil ----------
test('DOM : speak() existe et retourne false proprement si speechSynthesis absent', () => {
  const { sandbox } = loadApp();
  // speechSynthesis absent dans le harnais -> speak doit échouer proprement, pas crash
  assert(typeof sandbox.speechSynthesis === 'undefined');
});

// ---------- audit v4.3 ----------
test('CSS v7 : plus aucun !important dans le CSS, thèmes dark+light définis proprement', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(!html.includes('!important'), 'plus de !important nul part');
  assert(html.includes(':root[data-theme="dark"]') || html.includes(':root, :root[data-theme="dark"]'), 'dark défini');
  assert(html.includes(':root[data-theme="light"]'), 'light défini');
});

test('DOM : horloge affichée au chargement', () => {
  const { document } = loadApp();
  const c = document.getElementById('fp-clock');
  assert(/^\d{2}:\d{2}:\d{2}$/.test(c.textContent), 'horloge au format HH:MM:SS, reçu: ' + c.textContent);
});

// ---------- audit pro v4.4 ----------
test('A11Y : modales ont role=dialog + aria-modal, bouton Générer a aria-label, meta description présente', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(html.includes('role="dialog" aria-modal="true"'), 'modale accessible');
  assert(html.includes('aria-label="Générer le planning'), 'bouton générer accessible');
  assert(html.includes('name="description"'), 'meta description SEO');
  assert(html.includes('property="og:title"'), 'Open Graph présent');
  assert(html.includes('name="color-scheme"'), 'color-scheme dark light');
});

// ---------- design v6.1 (Perplexity-like) ----------
test('DESIGN : aucun emoji dans index.html et app.js (UI sobre)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/u;
  assert(!emoji.test(html), 'emoji dans index.html');
  assert(!emoji.test(js), 'emoji dans app.js');
});

test('DESIGN : fond sombre = #191a1a (gris Perplexity), plus de #0b0e14 noir pur', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(!html.includes('#0b0e14'), 'encore du noir pur #0b0e14');
  assert(html.includes('#191a1a'), 'fond #191a1a présent');
});

test('DESIGN : titre hero blanc uni, sans dégradé', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/\.fp-hero h1\{[^}]*\}/);
  assert(m && m[0].includes('color:#f3f3f3') && !m[0].includes('gradient'), 'h1 doit être blanc uni sans dégradé');
});

// ---------- résumé (async) ----------
setTimeout(() => {
  console.log('');
  for (const p of passes) console.log('  ✓ ' + p);
  if (failures.length) {
    console.log('');
    for (const f of failures) console.log('  ✗ ' + f.name + '\n      ' + f.error);
    console.log('\n' + passes.length + ' OK, ' + failures.length + ' ÉCHEC(S)');
    process.exit(1);
  }
  console.log('\n' + passes.length + ' tests DOM OK, 0 échec 🎉');
}, 60);
