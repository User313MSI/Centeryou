const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = !app.isPackaged;

app.commandLine.appendSwitch('disable-features', 'Auxclick');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0d1117',
    title: 'VaultGuard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url;
    if (url.startsWith('file://')) return callback({ cancel: false });
    callback({ cancel: true });
  });
  win.loadFile('index.html');
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  return win;
}

function isPathInside(baseDir, target) {
  const rel = path.relative(baseDir, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const MAX_PATH_LEN = 4096;
const MAX_IPC_STRING = 1024 * 1024;

function safeResolve(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > MAX_PATH_LEN) return null;
  if (p.indexOf('\0') !== -1) return null;
  if (/[<>"|?*]/.test(p) && process.platform === 'win32') {
    const base = path.basename(p);
    if (base !== p && base.length === 0) return null;
  }
  try {
    return path.resolve(p);
  } catch (e) {
    return null;
  }
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function safeString(v, max = MAX_IPC_STRING) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function safeStringArray(v, maxLen, maxItems) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.length > 0 && x.indexOf('\0') === -1)
    .map((x) => x.slice(0, maxLen))
    .slice(0, maxItems);
}

function validateScanArgs(args) {
  if (!isPlainObject(args)) return null;
  const dir = safeResolve(args.dir);
  if (!dir) return null;
  return {
    dir,
    maxFiles: clampInt(args.maxFiles, 1, 200000, 20000),
    maxDepth: clampInt(args.maxDepth, 1, 24, 12),
  };
}

function listFilesRecursive(dir, opts = {}) {
  const out = [];
  const maxFiles = opts.maxFiles || 20000;
  const maxDepth = opts.maxDepth || 12;
  const skipDirs = new Set(['node_modules', '.git', 'proc', 'sys', 'dev', '$Recycle.Bin', 'System Volume Information']);
  const skipNameChars = /[\0]/;
  const walk = (d, depth) => {
    if (out.length >= maxFiles || depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const ent of entries) {
      if (out.length >= maxFiles) return;
      if (skipNameChars.test(ent.name)) continue;
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (!skipDirs.has(ent.name)) walk(full, depth + 1);
      } else if (ent.isFile()) {
        let st = null;
        try { st = fs.statSync(full); } catch (e) { continue; }
        out.push({ path: full.slice(0, MAX_PATH_LEN), name: ent.name.slice(0, 200), size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  };
  walk(dir, 0);
  return out;
}

const HANDLERS = {
  'scan:pick-dirs': async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections', 'createDirectory'],
    });
    if (canceled || !filePaths.length) return { ok: false, canceled: true };
    return { ok: true, dirs: safeStringArray(filePaths, MAX_PATH_LEN, 64) };
  },

  'scan:list-files': (event, args) => {
    const v = validateScanArgs(args);
    if (!v) return { ok: false, error: 'Invalid path' };
    const resolved = v.dir;
    if (!fs.existsSync(resolved)) return { ok: false, error: 'Path does not exist' };
    try {
      const st = fs.statSync(resolved);
      if (st.isFile()) {
        return { ok: true, files: [{ path: resolved, name: path.basename(resolved).slice(0, 200), size: st.size, mtimeMs: st.mtimeMs }] };
      }
    } catch (e) {
      return { ok: false, error: 'Cannot stat path' };
    }
    try {
      const t0 = Date.now();
      const files = listFilesRecursive(resolved, { maxFiles: v.maxFiles, maxDepth: v.maxDepth });
      return { ok: true, files, elapsedMs: Date.now() - t0, truncated: files.length >= v.maxFiles };
    } catch (e) {
      return { ok: false, error: 'Scan failed' };
    }
  },

  'scan:read-full-hash': (event, args) => {
    if (!isPlainObject(args)) return { ok: false, error: 'Invalid arguments' };
    const resolved = safeResolve(args.filePath);
    if (!resolved) return { ok: false, error: 'Invalid path' };
    let st;
    try { st = fs.statSync(resolved); } catch (e) { return { ok: false, error: 'Missing' }; }
    if (!st.isFile()) return { ok: false, error: 'Not a file' };
    if (st.size > 64 * 1024 * 1024) return { ok: false, error: 'Too large' };
    try {
      const crypto = require('crypto');
      const h = crypto.createHash('sha256');
      const fd = fs.openSync(resolved, 'r');
      try {
        const buf = Buffer.alloc(64 * 1024);
        let read;
        while ((read = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, read));
      } finally {
        fs.closeSync(fd);
      }
      return { ok: true, sha256: h.digest('hex'), size: st.size };
    } catch (e) {
      return { ok: false, error: 'Hash failed' };
    }
  },

  'scan:read-head': (event, args) => {
    if (!isPlainObject(args)) return { ok: false, error: 'Invalid arguments' };
    const resolved = safeResolve(args.filePath);
    if (!resolved) return { ok: false, error: 'Invalid path' };
    const n = clampInt(args.bytes, 16, 1024 * 1024, 4096);
    let fd;
    try {
      fd = fs.openSync(resolved, 'r');
      const buf = Buffer.alloc(n);
      const read = fs.readSync(fd, buf, 0, n, 0);
      return { ok: true, data: buf.subarray(0, read).toString('base64') };
    } catch (e) {
      return { ok: false, error: 'Read failed' };
    } finally {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch (e) {} }
    }
  },

  'quarantine:dir': () => {
    const dir = path.join(app.getPath('userData'), 'quarantine');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    return { ok: true, dir };
  },

  'quarantine:isolate': (event, args) => {
    if (!isPlainObject(args)) return { ok: false, error: 'Invalid arguments' };
    const resolved = safeResolve(args.filePath);
    if (!resolved) return { ok: false, error: 'Invalid path' };
    if (Security_looksLikeTraversal(resolved)) return { ok: false, error: 'Invalid path' };
    const qDir = path.join(app.getPath('userData'), 'quarantine');
    try { fs.mkdirSync(qDir, { recursive: true }); } catch (e) { return { ok: false, error: 'Quarantine unavailable' }; }
    const safeName = path.basename(resolved).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
    const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const dest = path.join(qDir, token + '__' + safeName + '.vgq');
    if (!isPathInside(qDir, dest)) return { ok: false, error: 'Invalid destination' };
    let st;
    try { st = fs.statSync(resolved); } catch (e) { return { ok: false, error: 'Source missing' }; }
    if (!st.isFile()) return { ok: false, error: 'Source is not a file' };
    if (st.size > 512 * 1024 * 1024) return { ok: false, error: 'File too large to quarantine' };
    try {
      fs.copyFileSync(resolved, dest);
      try { fs.unlinkSync(resolved); } catch (e) { try { fs.unlinkSync(dest); } catch (e2) {} return { ok: false, error: 'Copied but could not remove original' }; }
      try { fs.chmodSync(dest, 0o600); } catch (e) {}
      return { ok: true, dest, threatName: safeString(args.threatName, 120) || 'Unknown' };
    } catch (e) {
      return { ok: false, error: 'Isolation failed' };
    }
  },

  'quarantine:list': () => {
    const qDir = path.join(app.getPath('userData'), 'quarantine');
    try {
      const entries = fs.readdirSync(qDir).filter((f) => f.endsWith('.vgq') && f.indexOf('..') === -1 && f.length < 200);
      return {
        ok: true,
        items: entries.slice(0, 5000).map((f) => {
          let st = null;
          try { st = fs.statSync(path.join(qDir, f)); } catch (e) {}
          return { name: f, size: st ? st.size : 0, mtimeMs: st ? st.mtimeMs : 0 };
        }),
      };
    } catch (e) {
      return { ok: true, items: [] };
    }
  },

  'quarantine:delete': (event, args) => {
    if (!isPlainObject(args)) return { ok: false, error: 'Invalid arguments' };
    const name = safeString(args.name, 200);
    if (!name.endsWith('.vgq') || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { ok: false, error: 'Invalid name' };
    }
    const qDir = path.join(app.getPath('userData'), 'quarantine');
    const target = path.join(qDir, name);
    if (!isPathInside(qDir, target)) return { ok: false, error: 'Invalid path' };
    try {
      fs.unlinkSync(target);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Delete failed' };
    }
  },

  'report:save': async (event, args) => {
    if (!isPlainObject(args)) return { ok: false, error: 'Invalid report' };
    const data = safeString(args.data, 2 * 1024 * 1024);
    if (!data) return { ok: false, error: 'Invalid report' };
    try { JSON.parse(data); } catch (e) { return { ok: false, error: 'Report is not valid JSON' }; }
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: 'vaultguard-report.json',
      filters: [{ name: 'VaultGuard Report', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(filePath, data, { encoding: 'utf8' });
      return { ok: true, filePath, bytes: data.length };
    } catch (e) {
      return { ok: false, error: 'Write failed' };
    }
  },

  'app:home': () => ({ ok: true, home: os.homedir() }),

  'app:stats': () => ({
    ok: true,
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    uptime: os.uptime(),
    version: app.getVersion(),
  }),
};

function Security_looksLikeTraversal(p) {
  return p.split(/[\\/]/).includes('..');
}

app.whenReady().then(() => {
  for (const [channel, handler] of Object.entries(HANDLERS)) {
    ipcMain.handle(channel, (event, ...args) => {
      if (!event.senderFrame) return { ok: false, error: 'No frame' };
      try {
        return handler(event, ...args);
      } catch (e) {
        return { ok: false, error: 'Handler error' };
      }
    });
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e) => e.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
