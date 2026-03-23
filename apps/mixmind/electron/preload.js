/**
 * Preload script — exposes safe APIs to the renderer via contextBridge.
 * The renderer can call window.mixmind.* to communicate with the main process.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mixmind', {
  // Called by renderer on boot to get sidecar port
  onSidecarPort: (callback) => ipcRenderer.on('sidecar-port', (_, port) => callback(port)),

  // Called by renderer when auth token arrives via deep link
  onAuthToken: (callback) => ipcRenderer.on('auth-token', (_, token) => callback(token)),

  // Open external URL in system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Open Rekordbox app
  openRekordbox: () => ipcRenderer.invoke('open-rekordbox'),
});
