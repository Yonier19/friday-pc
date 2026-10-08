const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  launchEdgeApp: (port) => ipcRenderer.invoke('launch-edge-app', port),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  encryptString: (text) => ipcRenderer.invoke('encrypt-string', text),
  decryptString: (encryptedBase64) => ipcRenderer.invoke('decrypt-string', encryptedBase64),
  
  // Auto-start with Windows
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),

  // Windows Notifications Reader API
  onNotificationReceived: (callback) => {
    const handler = (event, notification) => callback(notification);
    ipcRenderer.on('notification-received', handler);
    return () => ipcRenderer.removeListener('notification-received', handler);
  },
  getRecentNotifications: () => ipcRenderer.invoke('get-recent-notifications'),
  setNotificationReaderConfig: (config) => ipcRenderer.invoke('set-notification-reader-config', config),
});
