const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  /** Register a callback to run before the app quits (e.g., MIDI panic) */
  onBeforeQuit: (callback) => {
    ipcRenderer.on("app-before-quit", callback);
  },
  readPrefs: () => ipcRenderer.invoke("read-prefs"),
  writePrefs: (data) => ipcRenderer.invoke("write-prefs", data),
});
