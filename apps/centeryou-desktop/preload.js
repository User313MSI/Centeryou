const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('centeryouDesktop', {
  retry: () => ipcRenderer.invoke('centeryou:retry'),
  isOnline: () => ipcRenderer.invoke('centeryou:is-online'),
  version: () => ipcRenderer.invoke('centeryou:version'),
  onStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('centeryou:status', listener);
    return () => ipcRenderer.removeListener('centeryou:status', listener);
  },
});
