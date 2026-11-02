const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#101418',
    title: 'FlowPlan',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // aucune permission superflue
      disableBlinkFeatures: 'Auxclick',
    },
  });

  Menu.setApplicationMenu(null);

  // Sécurité : jamais de navigation hors de l'app, jamais de nouvelles fenêtres
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('file://' + __dirname);
    if (!allowed) event.preventDefault();
  });
  // Liens externes -> navigateur par défaut, jamais dans l'app
  win.webContents.on('set-window-open-handler', () => ({ action: 'deny' }));
  win.webContents.on('will-attach-webview', (event) => { event.preventDefault(); });

  win.loadFile('index.html');
  if (!app.isPackaged) win.webContents.openDevTools({ mode: 'detach' });
  return win;
}

app.whenReady().then(() => {
  // Liens externes ouverts dans le navigateur système
  app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (e, url) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        e.preventDefault();
        shell.openExternal(url);
      }
    });
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
