const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('flowplan', {
  isDesktop: true,
});
