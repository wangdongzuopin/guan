const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  scanApps: () => ipcRenderer.invoke("desktop:scan-apps"),
  launchApp: (appInfo) => ipcRenderer.invoke("desktop:launch-app", appInfo),
  onScanProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop:scan-progress", handler);
    return () => ipcRenderer.removeListener("desktop:scan-progress", handler);
  }
});
