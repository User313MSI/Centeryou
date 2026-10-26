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
  isDesktop: true,
});
