const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#101418',
    title: 'HarborCut',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadFile('index.html');
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  return win;
}

const HANDLERS = {
  'project:save': async (event, { defaultPath, data }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultPath || 'project.hcproj',
      filters: [{ name: 'HarborCut Project', extensions: ['hcproj'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const json = JSON.stringify(data);
    fs.writeFileSync(filePath, json, { encoding: 'utf8' });
    return { ok: true, filePath, bytes: json.length };
  },

  'project:open': async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'HarborCut Project', extensions: ['hcproj'] }],
    });
    if (canceled || !filePaths.length) return { ok: false, canceled: true };
    try {
      const raw = fs.readFileSync(filePaths[0], { encoding: 'utf8' });
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return { ok: false, error: 'Invalid project file' };
      }
      return { ok: true, filePath: filePaths[0], data };
    } catch (e) {
      return { ok: false, error: 'Could not read project: ' + e.message };
    }
  },

  'project:autosave': (event, { filePath, data }) => {
    if (typeof filePath !== 'string' || !filePath.endsWith('.hcproj')) {
      return { ok: false, error: 'Invalid autosave path' };
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(data), { encoding: 'utf8' });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};

app.whenReady().then(() => {
  for (const [channel, handler] of Object.entries(HANDLERS)) {
    ipcMain.handle(channel, handler);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
