const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  scanApps: () => ipcRenderer.invoke("desktop:scan-apps"),
  launchApp: (appInfo) => ipcRenderer.invoke("desktop:launch-app", appInfo),
  runtimeStats: (apps) => ipcRenderer.invoke("desktop:runtime-stats", apps),
  forceStopApp: (payload) => ipcRenderer.invoke("desktop:force-stop-app", payload),
  openNewsDetail: (news) => ipcRenderer.invoke("desktop:open-news-detail", news),
  setSplashProgress: (payload) => ipcRenderer.invoke("desktop:splash-progress", payload),
  onScanProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop:scan-progress", handler);
    return () => ipcRenderer.removeListener("desktop:scan-progress", handler);
  }
});
