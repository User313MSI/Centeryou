const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('vaultguard', {
  pickScanDirs: invoke('scan:pick-dirs'),
  listFiles: invoke('scan:list-files'),
  readHead: invoke('scan:read-head'),
  hashFile: invoke('scan:read-full-hash'),
  quarantineDir: invoke('quarantine:dir'),
  isolate: invoke('quarantine:isolate'),
  quarantineList: invoke('quarantine:list'),
  quarantineDelete: invoke('quarantine:delete'),
  saveReport: invoke('report:save'),
  getHome: invoke('app:home'),
  getStats: invoke('app:stats'),
  listProcesses: invoke('sys:list-processes'),
  killProcess: invoke('sys:kill-process'),
  listConnections: invoke('sys:list-connections'),
  listAutoruns: invoke('boot:list-autoruns'),
  repairFile: invoke('repair:clean-file'),
  notify: (title, body) => ipcRenderer.send('app:notify', { title, body }),
  onQuickScan: (cb) => ipcRenderer.on('vg:quick-scan', cb),
  isDesktop: true,
});
