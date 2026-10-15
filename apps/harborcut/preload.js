const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harborcut', {
  saveProject: (defaultPath, data) => ipcRenderer.invoke('project:save', { defaultPath, data }),
  openProject: () => ipcRenderer.invoke('project:open'),
  autosave: (filePath, data) => ipcRenderer.invoke('project:autosave', { filePath, data }),
  isDesktop: true,
});
