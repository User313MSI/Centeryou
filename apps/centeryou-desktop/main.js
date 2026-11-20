const { app, BrowserWindow, Menu, Notification, ipcMain, net, screen, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'Centeryou';
const PROD_URL = process.env.CENTERYOU_URL || 'https://dev-apps-centeryou.vercel.app';
const PROD_ORIGIN = new URL(PROD_URL).origin;
const DOWNLOAD_URL = process.env.CENTERYOU_DOWNLOAD_URL || 'https://github.com/User313MSI/Centeryou/releases';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

let mainWindow = null;
let saveTimer = null;

function isAllowedUrl(url) {
  try {
    return new URL(url).origin === PROD_ORIGIN;
  } catch {
    return false;
  }
}

function openExternalIfPossible(url) {
  if (url.startsWith('https://')) {
    shell.openExternal(url);
    return true;
  }
  return false;
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function stateIsVisible(s) {
  if (!s || !Number.isFinite(s.width) || !Number.isFinite(s.height) || s.width < 200 || s.height < 200) return null;
  const visible = screen.getAllDisplays().some((d) => {
    const b = d.bounds;
    return s.x < b.x + b.width && s.x + s.width > b.x && s.y < b.y + b.height && s.y + s.height > b.y;
  });
  return visible ? s : null;
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const b = mainWindow.getBounds();
  const state = { x: b.x, y: b.y, width: b.width, height: b.height, isMaximized: mainWindow.isMaximized() };
  fs.writeFile(STATE_FILE, JSON.stringify(state), () => {});
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveWindowState, 400);
}

function loadApp() {
  mainWindow.loadURL(PROD_URL, { extraHeaders: 'cache-control: no-cache\n' });
}

function readBundledBuildInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'build-info.json'), 'utf8'));
  } catch {
    return null;
  }
}

async function checkForNewVersion() {
  const bundled = readBundledBuildInfo();
  try {
    const res = await net.fetch(PROD_URL, { headers: { 'cache-control': 'no-cache' } });
    const liveId = res.headers.get('x-vercel-id');
    if (bundled && bundled.buildId && liveId && bundled.buildId !== liveId) {
      const notif = new Notification({
        title: APP_NAME,
        body: 'Une nouvelle version de Centeryou est en ligne : télécharge le nouvel installateur.',
        icon: path.join(__dirname, 'assets', 'icon-192.png'),
      });
      notif.on('click', () => shell.openExternal(DOWNLOAD_URL));
      notif.show();
    }
  } catch {
    // Hors ligne : la page de repli offline.html prend le relais.
  }
}

function createWindow() {
  const s = stateIsVisible(loadWindowState());
  mainWindow = new BrowserWindow({
    x: s ? s.x : undefined,
    y: s ? s.y : undefined,
    width: s ? s.width : 1280,
    height: s ? s.height : 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#FAFAFC',
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);

  if (s && s.isMaximized) mainWindow.maximize();

  mainWindow.on('resize', scheduleSave);
  mainWindow.on('move', scheduleSave);
  mainWindow.on('maximize', scheduleSave);
  mainWindow.on('unmaximize', scheduleSave);
  mainWindow.on('close', saveWindowState);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    mainWindow.webContents.send('centeryou:status', 'offline');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (isAllowedUrl(mainWindow.webContents.getURL())) {
      mainWindow.webContents.send('centeryou:status', 'online');
    }
  });

  loadApp();
  checkForNewVersion();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    callback(false);
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      let origin = '';
      try {
        origin = new URL(details.requestingUrl).origin;
      } catch {
        origin = '';
      }
      if (origin !== PROD_ORIGIN) return callback(false);
      if (permission === 'media') {
        const types = details.mediaTypes || [];
        return callback(!types.includes('video'));
      }
      if (permission === 'notifications') return callback(true);
      return callback(false);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      if (requestingOrigin !== PROD_ORIGIN) return false;
      if (permission === 'media') {
        const types = details.mediaTypes || [];
        return !types.includes('video');
      }
      if (permission === 'notifications') return true;
      return false;
    });

    app.on('web-contents-created', (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        if (isAllowedUrl(url)) return { action: 'allow' };
        openExternalIfPossible(url);
        return { action: 'deny' };
      });
      contents.on('will-navigate', (event, url) => {
        if (isAllowedUrl(url) || url === 'about:blank') return;
        event.preventDefault();
        openExternalIfPossible(url);
      });
      contents.on('will-attach-webview', (event) => event.preventDefault());
    });

    ipcMain.handle('centeryou:retry', () => {
      if (mainWindow && !mainWindow.isDestroyed()) loadApp();
    });
    ipcMain.handle('centeryou:is-online', () => net.isOnline());
    ipcMain.handle('centeryou:version', () => app.getVersion());

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
