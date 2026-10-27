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

  const ransomGuard = RansomGuard.createGuard();

  const monitor = Realtime.createMonitor({
    listFiles: (dir, maxFiles, maxDepth) => window.vaultguard.listFiles({ dir, maxFiles, maxDepth }),
    riskExt: (ext) => (Signatures.EXTENSION_RISK[ext] || 0),
    onNewFile: (f) => { if (ransomGuard.state.enabled) ransomGuard.recordNewFile(f); },
    onModified: (f) => { if (ransomGuard.state.enabled) ransomGuard.recordRename({ path: f.path, name: f.name, newName: f.name }); },
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
    if (name === 'ransomware') renderRansomware();
    if (name === 'schedule') renderSchedule();
    if (name === 'license') renderLicense();
    const main = $('content');
    if (main && typeof main.focus === 'function') main.focus({ preventScroll: true });
    announce(viewLabel(name));
  }

  function viewLabel(name) {
    return ({
      dashboard: 'Dashboard', scan: 'Scan', processes: 'Process protection',
      network: 'Network protection', realtime: 'Real-time protection', ransomware: 'Ransomware protection',
      boot: 'Startup & persistence', schedule: 'Scheduled scans', quarantine: 'Quarantine',
      history: 'Scan history', license: 'License & activation', settings: 'Settings',
    })[name] || name;
  }

  function nativeNotify(title, body) {
    if (settings.notifications && window.vaultguard && window.vaultguard.notify) {
      try { window.vaultguard.notify(title, body); } catch (e) {}
    }
  }

  function refreshProcesses() {
    if (!window.vaultguard || !window.vaultguard.listProcesses) { toast('Requires the desktop app', true); return; }
    $('proc-list').innerHTML = '';
    Dom.replaceChildren($('proc-list'), skeletonRows(6));
    window.vaultguard.listProcesses().then((res) => {
      if (!res || !res.ok) { Dom.replaceChildren($('proc-list'), [Dom.emptyState('Could not list processes')]); return; }
      const { processes, summary } = ProcessGuard.scanProcesses(res.processes);
      $('proc-summary').textContent = `${summary.total} processes · ${summary.flagged.length} flagged (${summary.suspicious} suspicious, ${summary.malicious} malicious)`;
      const flagged = processes.filter((p) => p.risk !== 'clean').sort((a, b) => b.score - a.score);
      const shown = flagged.length ? flagged : processes.slice(0, 100);
      if (!shown.length) { Dom.replaceChildren($('proc-list'), [Dom.emptyState('No processes')]); return; }
      const children = [];
      if (flagged.length) children.push(Dom.el('div', { class: 'empty', style: { textAlign: 'left' }, text: `${flagged.length} flagged process(es) — showing flagged first` }));
      for (const p of shown.slice(0, 300)) {
        children.push(Dom.el('div', { class: 'result-row' }, [
          Dom.pill(p.risk, p.risk === 'malicious' ? 'infected' : p.risk === 'suspicious' ? 'suspicious' : p.risk === 'monitor' ? 'test' : 'clean'),
          Dom.el('span', { class: 'r-path', title: p.path }, [
            document.createTextNode(`${p.name} (pid ${p.pid})`),
            Dom.el('div', { class: 'muted', text: p.path || p.cmdline.slice(0, 120) }),
            Dom.scoreBar(p.score),
          ]),
          Dom.el('span', { class: 'r-reasons', text: p.findings.join('; ') || 'clean' }),
          Dom.el('span', { class: 'r-actions' }, p.risk === 'malicious' || p.risk === 'suspicious' ? [
            Dom.el('button', { class: 'vg-btn danger', text: 'Kill', onclick: () => killProc(p) }),
          ] : []),
        ]));
      }
      Dom.replaceChildren($('proc-list'), children);
    });
  }

  async function killProc(p) {
    if (!confirm(`Kill process ${p.name} (pid ${p.pid})?`)) return;
    const res = await window.vaultguard.killProcess({ pid: p.pid });
    if (res && res.ok) { toast(`Killed ${p.name}`); refreshProcesses(); }
    else toast('Kill failed: ' + (res && res.error ? res.error : 'unknown'), true);
  }

  function refreshNetwork() {
    if (!window.vaultguard || !window.vaultguard.listConnections) { toast('Requires the desktop app', true); return; }
    Dom.replaceChildren($('net-list'), skeletonRows(6));
    window.vaultguard.listConnections().then((res) => {
      if (!res || !res.ok) { Dom.replaceChildren($('net-list'), [Dom.emptyState('Could not list connections')]); return; }
      const { connections, summary } = NetGuard.scanConnections(res.connections);
      $('net-summary').textContent = `${summary.total} connections · ${summary.established} established · ${summary.flagged.length} flagged`;
      const flagged = connections.filter((c) => c.risk !== 'clean').sort((a, b) => b.score - a.score);
      const shown = flagged.length ? flagged : connections.slice(0, 100);
      if (!shown.length) { Dom.replaceChildren($('net-list'), [Dom.emptyState('No connections')]); return; }
      const children = [];
      if (flagged.length) children.push(Dom.el('div', { class: 'empty', style: { textAlign: 'left' }, text: `${flagged.length} flagged connection(s) — showing flagged first` }));
      for (const c of shown.slice(0, 300)) {
        children.push(Dom.el('div', { class: 'result-row' }, [
          Dom.pill(c.risk, c.risk === 'malicious' ? 'infected' : c.risk === 'suspicious' ? 'suspicious' : c.risk === 'monitor' ? 'test' : 'clean'),
          Dom.el('span', { class: 'r-path', title: `${c.local}:${c.localPort} → ${c.remote}:${c.remotePort}` }, [
            document.createTextNode(`${c.process || 'pid ' + c.pid} → ${c.remoteHost || c.remote}:${c.remotePort}`),
            Dom.el('div', { class: 'muted', text: `${c.protocol} ${c.state} · local ${c.localPort}` }),
            Dom.scoreBar(c.score),
          ]),
          Dom.el('span', { class: 'r-reasons', text: c.findings.join('; ') || 'clean' }),
          Dom.el('span', { class: 'r-actions' }),
        ]));
      }
      Dom.replaceChildren($('net-list'), children);
    });
  }

  function renderRansomware() {
    $('rg-toggle').checked = ransomGuard.state.enabled;
    const st = ransomGuard.status();
    const a = st.assessment;
    $('rg-status').textContent = st.tripped ? 'ALERT: ransomware-like activity detected' : (ransomGuard.state.enabled ? 'Monitoring' : 'Paused');
    $('rg-status').style.color = st.tripped ? 'var(--danger)' : '';
    $('rg-assessment').textContent = `Risk: ${a.risk} (score ${a.score}) · ${a.cryptoRenames} crypto-extension renames · ${a.notes} ransom note(s) found`;
    const dirs = $('rg-dirs');
    Dom.replaceChildren(dirs, st.protectedDirs.length ? st.protectedDirs.map((d) => Dom.chip(d, () => {})) : [Dom.el('span', { class: 'muted', text: 'No protected folders (real-time monitor feeds this view)' })]);
    const ev = ransomGuard.state.events;
    const events = $('rg-events');
    if (!ev.length) { Dom.replaceChildren(events, [Dom.emptyState('No events yet')]); return; }
    Dom.replaceChildren(events, ev.slice(0, 50).map((e) =>
      Dom.el('div', { class: 'event-row' }, [
        Dom.el('span', { class: 'e-time', text: fmtTime(e.ts) }),
        Dom.el('span', { class: `e-kind ${e.kind === 'rename' && e.toCrypto ? 'new-executable' : 'new'}`, text: e.kind === 'rename' ? (e.toCrypto ? 'crypto-rename' : 'rename') : 'new file' }),
        Dom.el('span', { class: 'e-path', title: e.path, text: e.name }),
      ])
    ));
    if (st.tripped) {
      nativeNotify('VaultGuard — Ransomware alert', 'Ransomware-like file activity detected. Review the Ransomware view.');
      toast('Ransomware-like activity detected!', true);
    }
  }

  function refreshBoot() {
    if (!window.vaultguard || !window.vaultguard.listAutoruns) { toast('Requires the desktop app', true); return; }
    Dom.replaceChildren($('boot-list'), skeletonRows(6));
    window.vaultguard.listAutoruns().then((res) => {
      if (!res || !res.ok) { Dom.replaceChildren($('boot-list'), [Dom.emptyState('Could not read startup items')]); return; }
      const { entries, summary } = BootGuard.scanEntries(res.entries);
      $('boot-summary').textContent = `${summary.total} startup items · ${summary.flagged.length} flagged`;
      const flagged = entries.filter((e) => e.risk !== 'clean').sort((a, b) => b.score - a.score);
      const shown = flagged.length ? flagged : entries.slice(0, 100);
      if (!shown.length) { Dom.replaceChildren($('boot-list'), [Dom.emptyState('No startup items')]); return; }
      const children = [];
      if (flagged.length) children.push(Dom.el('div', { class: 'empty', style: { textAlign: 'left' }, text: `${flagged.length} flagged startup item(s) — showing flagged first` }));
      for (const e of shown.slice(0, 300)) {
        children.push(Dom.el('div', { class: 'result-row' }, [
          Dom.pill(e.risk, e.risk === 'malicious' ? 'infected' : e.risk === 'suspicious' ? 'suspicious' : e.risk === 'review' ? 'test' : 'clean'),
          Dom.el('span', { class: 'r-path', title: e.value }, [
            document.createTextNode(e.name),
            Dom.el('div', { class: 'muted', text: `${e.location} · ${e.value.slice(0, 100)}` }),
            Dom.scoreBar(e.score),
          ]),
          Dom.el('span', { class: 'r-reasons', text: e.findings.join('; ') || 'clean' }),
          Dom.el('span', { class: 'r-actions' }),
        ]));
      }
      Dom.replaceChildren($('boot-list'), children);
    });
  }

  function renderSchedule() {
    const jobs = Scheduler.list();
    const el = $('job-list');
    if (!jobs.length) { Dom.replaceChildren(el, [Dom.emptyState('No scheduled scans')]); return; }
    Dom.replaceChildren(el, jobs.map((j) =>
      Dom.el('div', { class: 'result-row' }, [
        Dom.pill(j.enabled ? 'active' : 'paused', j.enabled ? 'clean' : 'suspicious'),
        Dom.el('span', { class: 'r-path', title: j.targets.join(', ') }, [
          document.createTextNode(j.name),
          Dom.el('div', { class: 'muted', text: `${j.type} · every ${j.interval / 3600000 >= 24 ? (j.interval / 86400000) + ' d' : (j.interval / 3600000) + ' h'} · next: ${Scheduler.nextRunLabel(j)}` }),
        ]),
        Dom.el('span', { class: 'r-reasons', text: j.lastRun ? 'last run ' + new Date(j.lastRun).toLocaleString() : 'never run' }),
        Dom.el('span', { class: 'r-actions' }, [
          Dom.el('button', { class: 'vg-btn', text: j.enabled ? 'Pause' : 'Resume', onclick: () => { Scheduler.toggleJob(j.id, !j.enabled); renderSchedule(); } }),
          Dom.el('button', { class: 'vg-btn danger', text: 'Delete', onclick: () => { if (confirm('Delete this schedule?')) { Scheduler.removeJob(j.id); renderSchedule(); } } }),
        ]),
      ])
    ));
  }

  function renderExclusions() {
    const el = $('excl-list');
    const items = Exclusions.list();
    if (!items.length) { Dom.replaceChildren(el, [Dom.el('span', { class: 'muted', text: 'No exclusions' })]); return; }
    Dom.replaceChildren(el, items.map((x) => Dom.chip(x, () => { Exclusions.remove(x); renderExclusions(); })));
  }

  let schedTimer = null;
  function startSchedulerLoop() {
    if (schedTimer) clearInterval(schedTimer);
    schedTimer = setInterval(() => {
      const due = Scheduler.dueJobs();
      for (const j of due) {
        Scheduler.markRun(j.id);
        toast(`Scheduled scan started: ${j.name}`);
        runScan(j.type === 'quick' ? 'quick' : 'custom', j.type === 'quick' ? undefined : j.targets);
        break;
      }
    }, 30000);
    if (schedTimer.unref) schedTimer.unref();
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
    const feature = kind === 'quick' ? 'quickScan' : (kind === 'full' ? 'fullScan' : 'customScan');
    const gate = License.canUse(feature);
    if (!gate.allowed) {
      toast(gate.reason, true);
      if (gate.upgrade) switchView('license');
      return;
    }
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

  function licenseLabelFor(st) {
    if (st.state === 'licensed') return st.planName + (st.customer ? ' · ' + st.customer : '');
    if (st.state === 'trial') return 'Trial · ' + st.daysLeft + ' days left';
    if (st.state === 'invalid-license') return 'License invalid';
    return 'Trial expired';
  }

  function renderLicenseBadge() {
    const el = $('license-badge');
    if (!el) return;
    const st = License.status();
    el.hidden = false;
    el.textContent = licenseLabelFor(st);
    el.classList.remove('trial', 'expired', 'invalid');
    if (st.state === 'trial') el.classList.add('trial');
    if (st.state === 'expired') el.classList.add('expired');
    if (st.state === 'invalid-license') el.classList.add('invalid');
    if (window.vaultguard && window.vaultguard.reportLicense) {
      window.vaultguard.reportLicense({ label: licenseLabelFor(st) }).catch(() => {});
    }
  }

  function renderLicense() {
    const st = License.status();
    $('lic-status').textContent = ({
      licensed: 'Active', trial: 'Trial active', expired: 'Trial expired', 'invalid-license': 'License invalid',
    })[st.state] || st.state;
    $('lic-plan').textContent = st.state === 'licensed' ? st.planName : (st.state === 'trial' ? 'Full-feature trial' : '—');
    $('lic-customer').textContent = st.customer || '—';
    $('lic-expires').textContent = st.state === 'licensed' ? License.fmtDate(st.expires) + ' (' + st.daysLeft + ' days left)' : '—';
    $('lic-machine').textContent = License.machineId();
    const trial = License.trialState();
    $('lic-trial').textContent = trial.active ? trial.daysLeft + ' days remaining' : 'Ended';
    $('lic-trial-ends').textContent = License.fmtDate(trial.endsAt);
    const banner = $('lic-banner');
    if (st.state === 'licensed') {
      banner.hidden = true;
    } else if (st.state === 'trial') {
      banner.hidden = false;
      banner.classList.add('trial');
      banner.textContent = 'You are using the free 14-day trial. ' + st.daysLeft + ' days left — activate a license below to keep full protection after the trial ends.';
    } else {
      banner.hidden = false;
      banner.classList.remove('trial');
      banner.textContent = st.state === 'invalid-license'
        ? (st.message || 'Your license is invalid. Please reactivate.')
        : 'Your 14-day trial has ended. Activate a VaultGuard license to restore full protection.';
    }
    renderLicenseBadge();
  }

  function activateLicense() {
    const raw = $('lic-key-input').value;
    const customer = $('lic-customer-input').value.trim();
    const out = $('lic-result');
    out.className = '';
    out.classList.add('muted');
    const res = License.activate(raw, { customer });
    if (res.valid) {
      out.classList.add('ok');
      out.textContent = 'Activated: ' + res.planName + ' — valid until ' + License.fmtDate(res.expires) + '.';
      $('lic-key-input').value = '';
      toast('VaultGuard activated — ' + res.planName);
      nativeNotify('VaultGuard activated', res.planName + ' is now active on this machine.');
    } else {
      out.classList.add('err');
      out.textContent = res.message || 'Activation failed.';
      toast('Activation failed', true);
    }
    renderLicense();
  }

  async function checkForUpdates() {
    const statusEl = $('update-status');
    const btn = $('btn-update-check');
    if (!window.vaultguard || !window.vaultguard.checkForUpdates) { statusEl.textContent = 'Requires the desktop app.'; return; }
    const url = $('update-url').value.trim() || 'https://updates.novaloom.com/vaultguard/manifest.json';
    btn.disabled = true;
    statusEl.textContent = 'Checking ' + url + ' …';
    try {
      const res = await window.vaultguard.checkForUpdates({ url, timeoutMs: 10000 });
      if (!res || !res.ok) { statusEl.textContent = 'Update check failed: ' + ((res && res.error) || 'unknown error'); return; }
      const check = Updater.needsUpdate(res.manifest);
      Updater.recordCheck(check.update ? 'ok' : 'up-to-date');
      $('update-last-check').textContent = new Date().toLocaleString();
      if (!check.trusted) {
        statusEl.textContent = 'Rejected manifest: ' + check.reason + '. Updates are only accepted from a signed NovaLoom channel.';
        toast('Update manifest rejected', true);
        return;
      }
      $('update-latest').textContent = check.available + ' (' + check.signatures + ' signatures, ' + check.channel + ')';
      if (check.update) {
        statusEl.textContent = 'Update available: ' + check.available + ' (you have ' + check.current + '). Signature verified.';
        toast('Update available: ' + check.available);
        nativeNotify('VaultGuard update available', check.available + ' is ready (signature verified).');
        if (Updater.status().autoUpdate) Updater.stageUpdate(check.available);
      } else {
        statusEl.textContent = 'VaultGuard is up to date (' + check.current + '). Signature verified.';
        toast('VaultGuard is up to date');
      }
    } catch (e) {
      statusEl.textContent = 'Update check failed: network error';
    } finally {
      btn.disabled = false;
    }
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

    $('set-auto-update').checked = Updater.status().autoUpdate;
    $('set-auto-update').addEventListener('change', (e) => {
      Updater.setAutoUpdate(e.target.checked);
      toast(e.target.checked ? 'Automatic updates enabled' : 'Automatic updates disabled');
    });
    $('btn-update-check').addEventListener('click', checkForUpdates);
    $('update-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkForUpdates(); });
    if (window.vaultguard && window.vaultguard.autoStartEnabled) {
      window.vaultguard.autoStartEnabled().then((r) => {
        if (r && r.ok && $('set-autostart')) $('set-autostart').checked = !!r.enabled;
      });
    }
    if ($('set-autostart')) {
      $('set-autostart').addEventListener('change', async (e) => {
        if (!window.vaultguard || !window.vaultguard.setAutoStart) return;
        const res = await window.vaultguard.setAutoStart({ enabled: e.target.checked });
        toast(res && res.ok ? (res.enabled ? 'VaultGuard will start with your system' : 'Auto-start disabled') : 'Auto-start unavailable', !(res && res.ok));
      });
    }
  }

  function bindLicenseView() {
    $('btn-lic-activate').addEventListener('click', activateLicense);
    $('lic-key-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') activateLicense(); });
    $('btn-lic-deactivate').addEventListener('click', () => {
      if (!confirmAction('Deactivate VaultGuard on this machine? The trial will restart.')) return;
      License.deactivate();
      $('lic-result').textContent = '';
      renderLicense();
      toast('License deactivated');
    });
    if (window.vaultguard && window.vaultguard.onShowLicense) {
      window.vaultguard.onShowLicense(() => switchView('license'));
    }
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function initShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const map = { '1': 'dashboard', '2': 'scan', '3': 'processes', '4': 'network', '5': 'realtime', '6': 'ransomware', '7': 'boot', '8': 'schedule', '9': 'quarantine', '0': 'history' };
      if (map[k]) { e.preventDefault(); switchView(map[k]); }
      else if (k === 'l') { e.preventDefault(); switchView('license'); }
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

    $('btn-proc-refresh').addEventListener('click', refreshProcesses);
    $('btn-net-refresh').addEventListener('click', refreshNetwork);
    $('btn-boot-refresh').addEventListener('click', refreshBoot);
    $('rg-toggle').addEventListener('change', (e) => { ransomGuard.state.enabled = e.target.checked; renderRansomware(); });
    $('btn-rg-reset').addEventListener('click', () => { ransomGuard.reset(); renderRansomware(); toast('Alerts reset'); });
    $('btn-rg-add-dir').addEventListener('click', async () => {
      const res = await window.vaultguard.pickScanDirs();
      if (res && res.ok && res.dirs.length) { res.dirs.forEach((d) => { ransomGuard.addProtectedDir(d); monitor.addWatch(d); }); renderRansomware(); }
    });
    $('btn-job-add').addEventListener('click', () => {
      const name = $('job-name').value.trim() || 'Scheduled scan';
      const type = $('job-type').value;
      const interval = $('job-interval').value;
      const targets = type === 'custom' ? [...scanTargets] : [];
      if (type === 'custom' && !targets.length) { toast('Add custom targets in the Scan view first', true); return; }
      Scheduler.addJob({ name, type, interval, targets });
      $('job-name').value = '';
      renderSchedule();
      toast('Schedule created');
    });
    $('btn-excl-add').addEventListener('click', () => {
      const v = $('excl-input').value.trim();
      if (!v) return;
      Exclusions.add(v);
      $('excl-input').value = '';
      renderExclusions();
      toast('Exclusion added');
    });
    $('excl-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-excl-add').click(); });

    ransomGuard.onChange(() => { if (document.querySelector('#view-ransomware.active')) renderRansomware(); });

    if (window.vaultguard && window.vaultguard.onQuickScan) {
      window.vaultguard.onQuickScan(() => { switchView('scan'); runScan('quick'); });
    }

    startSchedulerLoop();
    renderExclusions();

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
    bindLicenseView();
    renderLicense();
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
