import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getPlayerFingerprints: () =>
    ipcRenderer.invoke('get-player-fingerprints') as Promise<{ serial1: string; serial2: string }>,
  readScreenCode: () => ipcRenderer.invoke('read-screen-code'),
  saveScreenCode: (code: string) => ipcRenderer.invoke('save-screen-code', code),
  getMediaCachePath: () => ipcRenderer.invoke('get-media-cache-path'),
  checkFileExists: (filePath: string) => ipcRenderer.invoke('check-file-exists', filePath),
  saveMediaFile: (filePath: string, buffer: ArrayBuffer) => ipcRenderer.invoke('save-media-file', filePath, buffer),
  clearMediaCacheDir: () => ipcRenderer.invoke('clear-media-cache-dir') as Promise<boolean>,
});

