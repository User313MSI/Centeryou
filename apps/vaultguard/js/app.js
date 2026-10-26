const App = (() => {
  const $ = (id) => document.getElementById(id);
  const esc = Dom.escapeHtml;

  const settings = {
    realtime: true,
    autoQuarantine: true,
    archives: false,
    notifications: true,
  };

  let currentScan = null;
  let lastSummary = { total: 0, clean: 0, suspicious: 0, infected: 0, test: 0, threats: [] };
  const scanTargets = [];
  const startedAt = Date.now();

  const monitor = Realtime.createMonitor({
    listFiles: (dir, maxFiles, maxDepth) => window.vaultguard.listFiles({ dir, maxFiles, maxDepth }),
    riskExt: (ext) => (Signatures.EXTENSION_RISK[ext] || 0),
  });

  const renderDashboardDebounced = (() => {
    let t = null;
    return () => {
      if (t) return;
      t = setTimeout(() => { t = null; refreshDashboard(); }, 120);
    };
  })();

  const renderRealtimeDebounced = (() => {
    let t = null;
    return () => {
      if (t) return;
      t = setTimeout(() => { t = null; if (document.querySelector('#view-realtime.active')) renderRealtime(); }, 150);
    };
  })();

  function toast(msg, danger = false) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('danger', danger);
    t.hidden = false;
    announce(msg);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString();
  }

  function fmtDuration(ms) {
    if (ms < 1000) return ms + ' ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
    return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's';
  }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  const readHeadLimited = (() => {
    const allow = Security.rateLimiter(500, 1000);
    return (path, bytes) => {
      if (!window.vaultguard) return Promise.resolve(new Uint8Array(0));
      if (!allow()) return Promise.resolve(new Uint8Array(0));
      return window.vaultguard.readHead({ filePath: path, bytes }).then((res) => {
        if (!res || !res.ok || !res.data) return new Uint8Array(0);
        return b64ToBytes(res.data);
      });
    };
  })();

  function readHeadViaBridge(path, bytes) {
    return readHeadLimited(path, bytes);
  }

  function switchView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => {
      const on = b.dataset.view === name;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    const el = $('view-' + name);
    if (el) el.classList.add('active');
    if (name === 'quarantine') renderQuarantine();
    if (name === 'history') renderHistory();
    if (name === 'realtime') renderRealtime();
    const main = $('content');
    if (main && typeof main.focus === 'function') main.focus({ preventScroll: true });
    announce(viewLabel(name));
  }

  function viewLabel(name) {
    return ({ dashboard: 'Dashboard', scan: 'Scan', realtime: 'Real-time protection', quarantine: 'Quarantine', history: 'Scan history', settings: 'Settings' })[name] || name;
  }

  function announce(text) {
    const lr = $('live-region');
    if (lr) lr.textContent = text;
  }

  function flash(el, kind) {
    if (!el) return;
    el.classList.remove('flash-danger', 'flash-ok');
    void el.offsetWidth;
    el.classList.add(kind === 'danger' ? 'flash-danger' : 'flash-ok');
    setTimeout(() => el.classList.remove('flash-danger', 'flash-ok'), 1000);
  }

  function setLoading(btn, loading, busyText) {
    if (!btn) return;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.classList.add('loading');
      btn.textContent = '';
      const spin = Dom.el('span', { class: 'spin', 'aria-hidden': 'true' });
      btn.appendChild(spin);
      btn.appendChild(document.createTextNode(busyText || 'Working…'));
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  }

  function skeletonRows(n) {
    const frag = [];
    for (let i = 0; i < n; i++) frag.push(Dom.el('div', { class: 'skeleton', style: { width: (55 + (i * 13) % 40) + '%' } }));
    return frag;
  }

  function refreshDashboard() {
    const q = Quarantine.list();
    $('stat-quarantined').textContent = q.length;
    $('stat-scanned').textContent = lastSummary.total.toLocaleString();
    $('stat-threats').textContent = (lastSummary.infected + lastSummary.suspicious + lastSummary.test).toLocaleString();
    $('stat-uptime').textContent = monitor.state.enabled ? fmtDuration(Date.now() - startedAt) : '—';
    const score = Shield.healthScore(lastSummary, monitor.status());
    $('health-score').textContent = score;
    $('health-label').textContent = Shield.healthLabel(score);
    const ring = $('ring-fg');
    const C = 2 * Math.PI * 52;
    ring.style.strokeDashoffset = C * (1 - score / 100);
    ring.style.stroke = score >= 90 ? 'var(--accent)' : score >= 50 ? 'var(--warn)' : 'var(--danger)';
    const badge = $('shield-badge');
    const on = monitor.state.enabled;
    badge.textContent = on ? 'Protection ON' : 'Protection OFF';
    badge.classList.toggle('off', !on);
    const d = $('health-detail');
    if (lastSummary.total === 0) d.textContent = 'Run a scan to assess your system.';
    else if (lastSummary.infected > 0) d.textContent = `${lastSummary.infected} infected file(s) found. Open Scan to act.`;
    else if (lastSummary.suspicious > 0) d.textContent = `${lastSummary.suspicious} suspicious file(s) found. Review them in Scan.`;
    else d.textContent = 'No threats found. Your system looks clean.';
    renderActivity();
  }

  function renderActivity() {
    const list = $('activity-list');
    const hist = Shield.history().slice(0, 8);
    const events = monitor.state.events.slice(0, 8);
    if (!hist.length && !events.length) {
      Dom.replaceChildren(list, [Dom.emptyState('No activity yet')]);
      return;
    }
    const rows = [];
    for (const h of hist) {
      rows.push({
        ts: h.ts,
        icon: h.threats ? '⚠️' : '✅',
        text: `${h.type} scan — ${h.scanned.toLocaleString()} files, ${h.threats} threat(s) in ${fmtDuration(h.durationMs)}`,
      });
    }
    for (const e of events) {
      rows.push({
        ts: e.ts,
        icon: e.kind === 'new-executable' ? '🚨' : e.kind === 'modified' ? '✏️' : e.kind === 'deleted' ? '🗑' : '📄',
        text: `${e.kind.replace('-', ' ')}: ${e.path}`,
      });
    }
    rows.sort((a, b) => b.ts - a.ts);
    Dom.replaceChildren(list, rows.slice(0, 10).map((r) =>
      Dom.el('div', { class: 'activity-item' }, [
        Dom.el('span', { class: 'a-icon', text: r.icon }),
        Dom.el('span', { class: 'a-text', text: r.text }),
        Dom.el('span', { class: 'a-time', text: fmtTime(r.ts) }),
      ])
    ));
  }

  function renderTargets() {
    const el = $('scan-targets');
    if (!scanTargets.length) { Dom.clear(el); return; }
    Dom.replaceChildren(el, scanTargets.map((t, i) =>
      Dom.chip(t, () => { scanTargets.splice(i, 1); renderTargets(); })
    ));
  }

  async function gatherTargets(kind) {
    if (kind === 'custom') return [...scanTargets];
    if (kind === 'quick') {
      const home = window.vaultguard ? (await window.vaultguard.getHome()).home : null;
      return home ? [home + '/Downloads', home + '/Desktop', home + '/Documents'].filter(Boolean) : [...scanTargets];
    }
    const res = await window.vaultguard.pickScanDirs();
    if (!res || !res.ok) return null;
    return res.dirs;
  }

  async function runScan(kind, targets) {
    if (currentScan) { toast('A scan is already running'); return; }
    if (!window.vaultguard) { toast('Scanning requires the desktop app', true); return; }
    const dirs = targets || (await gatherTargets(kind));
    if (!dirs || !dirs.length) { toast('No targets selected'); return; }
    const t0 = performance.now();
    currentScan = { cancelled: false };
    $('btn-scan-stop').hidden = false;
    $('scan-progress-wrap').hidden = false;
    const resultsEl = $('scan-results');
    Dom.replaceChildren(resultsEl, skeletonRows(6));
    const pbar = $('scan-progressbar');
    if (pbar) pbar.setAttribute('aria-valuenow', '0');
    switchView('scan');

    let files = [];
    const seenPaths = new Set();
    for (const dir of dirs) {
      const res = await window.vaultguard.listFiles({ dir, maxFiles: 50000, maxDepth: kind === 'quick' ? 4 : 12 });
      if (res && res.ok && Array.isArray(res.files)) {
        for (const f of res.files) {
          if (f && typeof f.path === 'string' && !seenPaths.has(f.path)) {
            seenPaths.add(f.path);
            files.push(f);
          }
        }
      }
      if (currentScan.cancelled) break;
    }
    files = files.slice(0, 50000);
    const uniqCount = files.length;

    const { results, summary } = await Scanner.scanFiles(files, readHeadViaBridge, (p) => {
      if (!p.finished) {
        const pct = Math.min(99, (p.done / Math.max(1, p.total)) * 100);
        $('scan-progress-fill').style.width = pct + '%';
        const pbar = $('scan-progressbar');
        if (pbar) pbar.setAttribute('aria-valuenow', Math.round(pct));
        $('scan-progress-text').textContent = `${p.done.toLocaleString()} / ${p.total.toLocaleString()}`;
        $('scan-current').textContent = p.current || '';
        $('scan-current').title = p.current || '';
      }
    }, { isCancelled: () => currentScan && currentScan.cancelled });

    currentScan = null;
    $('btn-scan-stop').hidden = true;
    $('scan-progress-fill').style.width = '100%';
    const pbarDone = $('scan-progressbar');
    if (pbarDone) pbarDone.setAttribute('aria-valuenow', '100');
    $('scan-progress-text').textContent = `${results.length.toLocaleString()} / ${results.length.toLocaleString()}`;
    $('scan-current').textContent = 'Finished';
    flash(resultsEl, summary.infected > 0 ? 'danger' : 'ok');
    lastSummary = summary;

    Shield.addScanRecord({
      type: kind, targets: dirs, scanned: summary.total,
      threats: summary.infected + summary.suspicious + summary.test,
      durationMs: performance.now() - t0,
      signatureVersion: Signatures.VERSION,
    });
    renderResults(results);
    refreshDashboard();
    if (settings.autoQuarantine) await autoQuarantine(summary.threats);
    const found = summary.infected + summary.suspicious + summary.test;
    toast(found > 0
      ? `Scan finished: ${found} threat(s) found`
      : `Scan finished: system clean (${summary.total.toLocaleString()} files)`,
      summary.infected > 0);
    announce(found > 0
      ? `Scan finished. ${found} threats found.`
      : `Scan finished. ${summary.total.toLocaleString()} files scanned, no threats.`);
  }

  async function autoQuarantine(threats) {
    let done = 0;
    for (const t of threats) {
      if (t.verdict !== Scanner.VERDICT.INFECTED && t.verdict !== Scanner.VERDICT.TEST) continue;
      const res = await window.vaultguard.isolate({ filePath: t.path, threatName: t.signatures.join(', ') || t.verdict });
      if (res && res.ok) {
        Quarantine.add({ name: t.name, originalPath: t.path, threatName: t.signatures.join(', ') || t.verdict, verdict: t.verdict, score: t.score, size: t.size, dest: res.dest });
        done++;
      }
    }
    if (done) toast(`Auto-quarantined ${done} file(s)`, true);
  }

  function resultRow(r) {
    const v = r.verdict;
    const conf = r.confidence || 'low';
    let qBtn = null;
    const actions = v === Scanner.VERDICT.CLEAN ? [] : [
      (qBtn = Dom.el('button', {
        class: 'vg-btn', text: 'Quarantine',
        onclick: () => quarantineOne(r, qBtn),
      })),
    ];
    return Dom.el('div', { class: 'result-row' }, [
      Dom.el('span', {}, [Dom.pill(v, v), Dom.el('span', { class: 'muted', style: { marginLeft: '6px', fontSize: '10px' }, text: conf })]),
      Dom.el('span', { class: 'r-path', title: r.path || '' }, [
        document.createTextNode((r.name || '') + (r.skipped ? ' (skipped)' : '')),
        Dom.scoreBar(r.score || 0),
      ]),
      Dom.el('span', { class: 'r-reasons', text: (r.reasons || []).join('; ') || 'clean' }),
      Dom.el('span', { class: 'r-actions' }, actions),
    ]);
  }

  function renderResults(results) {
    const el = $('scan-results');
    const MAX_ROWS = 300;
    const threats = results.filter((r) => r.verdict !== Scanner.VERDICT.CLEAN);
    let shown = threats.length ? threats : results.slice(0, MAX_ROWS);
    let truncated = false;
    if (shown.length > MAX_ROWS) { shown = shown.slice(0, MAX_ROWS); truncated = true; }
    if (!shown.length) { Dom.replaceChildren(el, [Dom.emptyState('No files scanned')]); return; }
    const children = [];
    if (threats.length) children.push(Dom.el('div', { class: 'empty', style: { textAlign: 'left' }, text: `${threats.length} threat(s) — showing threats first` }));
    for (const r of shown) children.push(resultRow(r));
    if (truncated) children.push(Dom.el('div', { class: 'muted', style: { padding: '8px 6px', textAlign: 'center' }, text: `Results truncated to ${MAX_ROWS} rows` }));
    Dom.replaceChildren(el, children);
  }

  async function quarantineOne(r, btnRef) {
    const res = await window.vaultguard.isolate({ filePath: r.path, threatName: (r.signatures || []).join(', ') || 'Unknown' });
    if (res && res.ok) {
      Quarantine.add({
        name: r.name, originalPath: r.path,
        threatName: (r.signatures || []).join(', ') || 'Unknown',
        verdict: r.verdict, score: r.score || 0,
        size: r.size || 0, dest: res.dest,
      });
      const row = btnRef.current && btnRef.current.closest('.result-row');
      if (row) row.remove();
      toast(`Quarantined: ${r.name}`, true);
      refreshDashboard();
    } else {
      toast('Quarantine failed: ' + (res && res.error ? res.error : 'unknown'), true);
    }
  }

  function quarantineRow(it) {
    return Dom.el('div', { class: 'result-row' }, [
      Dom.pill(it.threatName || 'Unknown', it.verdict || 'suspicious'),
      Dom.el('span', { class: 'r-path', title: it.originalPath || '' }, [
        document.createTextNode(it.name || ''),
        Dom.el('div', { class: 'muted', text: `${it.originalPath || ''} · ${fmtBytes(it.size || 0)} · score ${it.score || 0}` }),
      ]),
      Dom.el('span', { class: 'r-reasons', text: fmtTime(it.quarantinedAt) }),
      Dom.el('span', { class: 'r-actions' }, [
        Dom.el('button', { class: 'vg-btn danger', text: 'Delete', onclick: () => deleteQuarantined(it) }),
      ]),
    ]);
  }

  async function deleteQuarantined(it) {
    const fileName = (it.dest || '').split(/[\\/]/).pop();
    const res = fileName ? await window.vaultguard.quarantineDelete({ name: fileName }) : { ok: true };
    Quarantine.remove(it.id);
    renderQuarantine();
    refreshDashboard();
    toast(res && res.ok ? 'Deleted from quarantine' : 'Removed from list');
  }

  function renderQuarantine() {
    const el = $('quarantine-list');
    const items = Quarantine.list();
    if (!items.length) { Dom.replaceChildren(el, [Dom.emptyState('Quarantine is empty')]); return; }
    Dom.replaceChildren(el, items.map(quarantineRow));
  }

  function historyRow(h) {
    return Dom.el('div', { class: 'result-row' }, [
      Dom.pill(h.type || 'scan', h.threats ? 'infected' : 'clean'),
      Dom.el('span', { class: 'r-path', text: `${h.scanned.toLocaleString()} files · ${h.threats} threat(s) · ${fmtDuration(h.durationMs)}` }, [
        Dom.el('div', { class: 'muted', text: (h.targets || []).join(', ') || '—' }),
      ]),
      Dom.el('span', { class: 'r-reasons', text: new Date(h.ts).toLocaleString() }),
      Dom.el('span', { class: 'r-actions' }),
    ]);
  }

  function renderHistory() {
    const el = $('history-list');
    const items = Shield.history();
    if (!items.length) { Dom.replaceChildren(el, [Dom.emptyState('No scans recorded')]); return; }
    Dom.replaceChildren(el, items.map(historyRow));
  }

  function renderRealtime() {
    $('rt-toggle').checked = monitor.state.enabled;
    $('rt-status').textContent = monitor.state.enabled ? 'Monitoring' : 'Paused';
    const dirs = $('rt-dirs');
    if (!monitor.state.watchedDirs.length) {
      Dom.replaceChildren(dirs, [Dom.el('span', { class: 'muted', text: 'No folders watched' })]);
    } else {
      Dom.replaceChildren(dirs, monitor.state.watchedDirs.map((d) =>
        Dom.chip(d, () => monitor.removeWatch(d))
      ));
    }
    const events = $('rt-events');
    const ev = monitor.state.events;
    if (!ev.length) { Dom.replaceChildren(events, [Dom.emptyState('No events yet')]); return; }
    const VISIBLE_EVENTS = 50;
    const rows = ev.slice(0, VISIBLE_EVENTS).map((e) =>
      Dom.el('div', { class: `event-row${e.severity === 'high' ? ' sev-high' : e.severity === 'medium' ? ' sev-medium' : ''}` }, [
        Dom.el('span', { class: 'e-time', text: fmtTime(e.ts) }),
        Dom.el('span', { class: `e-kind ${e.kind}`, text: e.kind.replace('-', ' ') }),
        Dom.el('span', { class: 'e-path', title: e.path, text: e.path }),
      ])
    );
    if (ev.length > VISIBLE_EVENTS) {
      rows.push(Dom.el('div', { class: 'muted', style: { padding: '8px 6px', textAlign: 'center' }, text: `+ ${ev.length - VISIBLE_EVENTS} more event(s) — showing latest ${VISIBLE_EVENTS}` }));
    }
    Dom.replaceChildren(events, rows);
  }

  function signatureStats() {
    return {
      version: Signatures.VERSION,
      total: Signatures.countSignatures(),
      hex: Signatures.HEX_PATTERNS.length,
      text: Signatures.TEXT_PATTERNS.length,
      url: Signatures.URL_PATTERNS.length,
      mz: Signatures.MZ_CHECKS.length,
      names: Signatures.DANGEROUS_NAMES.length,
      extensions: Object.keys(Signatures.EXTENSION_RISK).length,
      behaviors: Scanner.BEHAVIOR_RULES.length,
    };
  }

  const exportLimited = Security.rateLimiter(3, 60000);

  async function exportReport() {
    if (!exportLimited()) { toast('Please wait before exporting again'); return; }
    const report = {
      app: 'VaultGuard',
      version: '1.0.0',
      signatureVersion: Signatures.VERSION,
      exportedAt: new Date().toISOString(),
      lastSummary: {
        total: lastSummary.total,
        clean: lastSummary.clean,
        suspicious: lastSummary.suspicious,
        infected: lastSummary.infected,
        test: lastSummary.test,
        threats: (lastSummary.threats || []).map((t) => ({
          path: Security.redactPath(t.path),
          name: t.name,
          verdict: t.verdict,
          score: t.score,
          signatures: t.signatures,
        })),
      },
      quarantine: Quarantine.list().map((q) => ({ ...q, originalPath: Security.redactPath(q.originalPath), dest: Security.redactPath(q.dest) })),
      history: Shield.history().map((h) => ({ ...h, targets: h.targets.map(Security.redactPath) })),
      monitor: monitor.status(),
    };
    const json = JSON.stringify(report, null, 2);
    if (window.vaultguard) {
      const res = await window.vaultguard.saveReport({ data: json });
      if (res && res.ok) toast('Report saved');
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vaultguard-report.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Report downloaded');
  }

  function bindSettings() {
    $('set-rt').checked = settings.realtime;
    $('set-autoq').checked = settings.autoQuarantine;
    $('set-archives').checked = settings.archives;
    $('set-notif').checked = settings.notifications;
    $('set-rt').addEventListener('change', (e) => { settings.realtime = e.target.checked; e.target.checked ? monitor.start() : monitor.stop(); refreshDashboard(); });
    $('set-autoq').addEventListener('change', (e) => { settings.autoQuarantine = e.target.checked; });
    $('set-archives').addEventListener('change', (e) => { settings.archives = e.target.checked; });
    $('set-notif').addEventListener('change', (e) => { settings.notifications = e.target.checked; });
    const stats = signatureStats();
    $('sig-version').textContent = `${stats.version} — ${stats.total} signatures (${stats.text} text · ${stats.url} URL · ${stats.hex} hex · ${stats.mz} PE · ${stats.behaviors} behavior rules)`;
    if (window.vaultguard) window.vaultguard.quarantineDir().then((r) => { if (r && r.ok) $('q-location').textContent = r.dir; });
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function initShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const map = { '1': 'dashboard', '2': 'scan', '3': 'realtime', '4': 'quarantine', '5': 'history', '6': 'settings' };
      if (map[k]) { e.preventDefault(); switchView(map[k]); }
      else if (k === 'q') { e.preventDefault(); if (!currentScan) runScan('quick'); }
      else if (k === 's' && e.shiftKey) { e.preventDefault(); runScan('full'); }
    });
  }

  function init() {
    document.querySelectorAll('.nav-btn').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
    const quick = () => { const b = $('btn-quick-scan'); setLoading(b, true, 'Scanning…'); runScan('quick').finally(() => setLoading(b, false)); };
    const full = () => { const b = $('btn-full-scan'); setLoading(b, true, 'Scanning…'); runScan('full').finally(() => setLoading(b, false)); };
    const custom = () => { const b = $('btn-custom-scan'); setLoading(b, true, 'Preparing…'); runScan('custom').finally(() => setLoading(b, false)); };
    $('btn-quick-scan').addEventListener('click', quick);
    $('btn-full-scan').addEventListener('click', full);
    $('btn-custom-scan').addEventListener('click', custom);
    $('btn-scan-quick').addEventListener('click', () => runScan('quick'));
    $('btn-scan-full').addEventListener('click', () => runScan('full'));
    $('btn-scan-custom').addEventListener('click', async () => {
      const res = await window.vaultguard.pickScanDirs();
      if (res && res.ok && res.dirs.length) { scanTargets.push(...res.dirs); renderTargets(); switchView('scan'); }
    });
    $('btn-scan-stop').addEventListener('click', () => { if (currentScan) currentScan.cancelled = true; });
    $('rt-toggle').addEventListener('change', (e) => { e.target.checked ? monitor.start() : monitor.stop(); refreshDashboard(); });
    $('btn-rt-add').addEventListener('click', async () => {
      const res = await window.vaultguard.pickScanDirs();
      if (res && res.ok && res.dirs.length) { res.dirs.forEach((d) => monitor.addWatch(d)); monitor.start(); }
    });
    $('btn-q-refresh').addEventListener('click', () => { renderQuarantine(); refreshDashboard(); });
    $('btn-q-clear').addEventListener('click', () => {
      if (!confirmAction('Clear the quarantine list? Files on disk stay in the quarantine folder.')) return;
      Quarantine.clear(); renderQuarantine(); refreshDashboard(); toast('Quarantine list cleared');
    });
    $('btn-h-clear').addEventListener('click', () => {
      if (!confirmAction('Clear all scan history?')) return;
      Shield.clearHistory(); renderHistory(); refreshDashboard(); toast('History cleared');
    });
    $('btn-h-export').addEventListener('click', exportReport);

    const hint = Dom.el('span', { class: 'kbd-hint', 'aria-hidden': 'true' }, [
      document.createTextNode('Shortcuts: '),
      Dom.el('kbd', { text: 'Ctrl+1..6' }), document.createTextNode(' views · '),
      Dom.el('kbd', { text: 'Ctrl+Q' }), document.createTextNode(' quick scan'),
    ]);
    const bar = $('topbar');
    if (bar) bar.appendChild(hint);

    initShortcuts();

    monitor.onChange(() => {
      renderDashboardDebounced();
      renderRealtimeDebounced();
    });

    bindSettings();
    if (settings.realtime) monitor.start();
    refreshDashboard();
    if (window.vaultguard) {
      window.vaultguard.getHome().then((r) => {
        if (r && r.ok) monitor.addWatch(r.home + '/Downloads');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { runScan, switchView };
})();
window.App = App;
