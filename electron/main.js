const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: "#eef4ff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL("http://localhost:8081");
  } else {
    win.loadFile(path.join(__dirname, "..", "desktop", "renderer-dist", "index.html"));
  }

  win.setMenu(null);

  win.webContents.on("before-input-event", (event, input) => {
    const openDevTools =
      input.type === "keyDown" &&
      (input.key === "F12" || ((input.control || input.meta) && input.shift && input.key.toUpperCase() === "I"));
    if (openDevTools) {
      event.preventDefault();
      win.webContents.openDevTools({ mode: "detach" });
    }
  });
}

function resolveShortcutTarget(shortcutPath) {
  try {
    return shell.readShortcutLink(shortcutPath)?.target || "";
  } catch {
    return "";
  }
}

function scanDesktopApps(event) {
  const result = [];
  const seenTarget = new Set();
  const startMenus = [
    path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(process.env.ProgramData || "", "Microsoft", "Windows", "Start Menu", "Programs")
  ].filter((p) => p && fs.existsSync(p));

  let found = 0;
  const collectLinks = [];
  for (const menu of startMenus) {
    const stack = [menu];
    while (stack.length > 0) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".lnk")) {
          collectLinks.push(fullPath);
        }
      }
    }
  }

  const total = collectLinks.length || 1;
  for (let i = 0; i < collectLinks.length; i += 1) {
    const link = collectLinks[i];
    const target = resolveShortcutTarget(link);
    const normalizedTarget = (target || "").toLowerCase();
    if (target && fs.existsSync(target) && !seenTarget.has(normalizedTarget)) {
      seenTarget.add(normalizedTarget);
      found += 1;
      const name = path.basename(link, ".lnk");
      const uniqueKey = crypto
        .createHash("sha1")
        .update(`${link}|${target}`)
        .digest("hex")
        .slice(0, 12);
      result.push({
        id: `desktop-${uniqueKey}`,
        name,
        packageName: `desktop:${path.basename(target).toLowerCase()}`,
        executablePath: target
      });
    }
    event.sender.send("desktop:scan-progress", {
      current: i + 1,
      total,
      percent: Math.round(((i + 1) / total) * 100),
      message: `正在扫描电脑软件 ${i + 1}/${total}`
    });
  }

  if (result.length === 0) {
    result.push(
      { id: "desktop-vscode", name: "VS Code", packageName: "desktop:vscode", launchUri: "vscode://" },
      {
        id: "desktop-edge",
        name: "Microsoft Edge",
        packageName: "desktop:edge",
        launchUri: "microsoft-edge:https://www.bing.com"
      },
      { id: "desktop-settings", name: "Windows Settings", packageName: "desktop:settings", launchUri: "ms-settings:" }
    );
  }

  return result.slice(0, 300);
}

ipcMain.handle("desktop:scan-apps", (event) => {
  return scanDesktopApps(event);
});

ipcMain.handle("desktop:launch-app", async (_event, appInfo) => {
  if (appInfo?.executablePath && fs.existsSync(appInfo.executablePath)) {
    spawn(appInfo.executablePath, [], {
      detached: true,
      stdio: "ignore",
      shell: true
    }).unref();
    return { ok: true };
  }
  if (appInfo?.launchUri) {
    await shell.openExternal(appInfo.launchUri);
    return { ok: true };
  }
  throw new Error("未找到可启动路径");
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
