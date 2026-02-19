const { app, BrowserWindow, ipcMain, shell, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;
let mainWindow = null;
let splashWindow = null;
let splashCloseTimer = null;
let splashPulseTimer = null;
let splashShownAt = 0;
const splashProgressState = {
  percent: 0,
  stage: "Bootstrapping",
  message: "Electron is loading resources..."
};

function getSplashLogoDataUrl() {
  const logoPath = path.join(__dirname, "..", "logo.jpeg");
  if (!fs.existsSync(logoPath)) return null;
  try {
    const raw = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${raw.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildSplashHtml(logoDataUrl) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loading</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        display: grid;
        place-items: center;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        background: radial-gradient(1200px 420px at 20% 10%, #dbeafe 0%, rgba(219,234,254,0) 60%),
                    radial-gradient(1000px 460px at 90% 95%, #ede9fe 0%, rgba(237,233,254,0) 60%),
                    #f8fafc;
      }
      .panel {
        width: 360px;
        border-radius: 24px;
        border: 1px solid #e2e8f0;
        background: rgba(255,255,255,0.9);
        box-shadow: 0 18px 45px rgba(30,41,59,0.12);
        padding: 22px 22px 18px;
      }
      .top { display: flex; align-items: center; gap: 12px; }
      .logo {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: linear-gradient(135deg, #58abed 0%, #3f95d9 100%);
        display: grid;
        place-items: center;
        color: #fff;
        font-weight: 800;
        overflow: hidden;
      }
      .logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .title { margin: 0; font-size: 17px; color: #0f172a; }
      .sub { margin: 2px 0 0; font-size: 12px; color: #64748b; }
      .bar { margin-top: 14px; height: 8px; border-radius: 999px; background: #eef2ff; overflow: hidden; }
      .run {
        height: 100%;
        width: var(--p, 18%);
        border-radius: 999px;
        background: linear-gradient(90deg, #58abed, #3f95d9);
        transition: width 220ms ease;
      }
      .dots { margin-top: 12px; display: flex; justify-content: center; gap: 7px; }
      .dot { width: 7px; height: 7px; border-radius: 50%; background: #58abed; animation: pulse 1.1s ease-in-out infinite; }
      .dot:nth-child(2) { animation-delay: 0.12s; }
      .dot:nth-child(3) { animation-delay: 0.24s; }
      @keyframes pulse { 0%, 100% { transform: scale(0.75); opacity: 0.45; } 50% { transform: scale(1); opacity: 1; } }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="top">
        <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="logo" />` : "g"}</div>
        <div>
          <h1 class="title">guan</h1>
          <p class="sub" id="sub">Electron is loading resources...</p>
        </div>
      </div>
      <div class="bar"><div class="run" id="run"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span id="stage" style="font-size:12px;color:#475569;">Bootstrapping</span>
        <span id="percent" style="font-size:12px;color:#58abed;font-weight:700;">0%</span>
      </div>
      <div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
    </div>
    <script>
      window.setSplashProgress = function(payload) {
        try {
          const p = Math.max(0, Math.min(100, Number(payload?.percent || 0)));
          const stage = payload?.stage || "Loading";
          const message = payload?.message || "Electron is loading resources...";
          const run = document.getElementById("run");
          const stageNode = document.getElementById("stage");
          const msgNode = document.getElementById("sub");
          const percentNode = document.getElementById("percent");
          if (run) run.style.setProperty("--p", p + "%");
          if (stageNode) stageNode.textContent = stage;
          if (msgNode) msgNode.textContent = message;
          if (percentNode) percentNode.textContent = Math.round(p) + "%";
        } catch {}
      };
      window.setSplashProgress({ percent: 6, stage: "Bootstrapping", message: "Electron is loading resources..." });
    </script>
  </body>
</html>`;
}

function postSplashProgress(payload) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const requested = Number(payload?.percent);
  const requestedPercent = Number.isFinite(requested) ? requested : splashProgressState.percent;
  const nextPercent =
    requestedPercent >= 100
      ? 100
      : Math.max(splashProgressState.percent, Math.max(0, Math.min(99, requestedPercent)));
  splashProgressState.percent = nextPercent;
  splashProgressState.stage = String(payload?.stage || splashProgressState.stage || "Loading");
  splashProgressState.message = String(payload?.message || splashProgressState.message || "Loading resources...");

  const safe = {
    percent: splashProgressState.percent,
    stage: splashProgressState.stage,
    message: splashProgressState.message
  };
  const script = `window.setSplashProgress && window.setSplashProgress(${JSON.stringify(safe)})`;
  splashWindow.webContents.executeJavaScript(script).catch(() => {});
}

function startSplashPulse() {
  if (splashPulseTimer) return;
  splashPulseTimer = setInterval(() => {
    if (!splashWindow || splashWindow.isDestroyed()) {
      clearInterval(splashPulseTimer);
      splashPulseTimer = null;
      return;
    }
    if (splashProgressState.percent >= 88) return;
    const step = splashProgressState.percent < 40 ? 3 : splashProgressState.percent < 70 ? 2 : 1;
    postSplashProgress({
      percent: splashProgressState.percent + step,
      stage: splashProgressState.stage,
      message: splashProgressState.message
    });
  }, 420);
}

function stopSplashPulse() {
  if (!splashPulseTimer) return;
  clearInterval(splashPulseTimer);
  splashPulseTimer = null;
}

function closeSplashWhenReady(delayMs = 260) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  if (splashCloseTimer) {
    clearTimeout(splashCloseTimer);
    splashCloseTimer = null;
  }
  const elapsed = splashShownAt > 0 ? Date.now() - splashShownAt : 0;
  const minVisible = 900;
  const wait = Math.max(delayMs, minVisible - elapsed);
  splashCloseTimer = setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
  }, wait);
}

function createSplashWindow() {
  return new Promise((resolve) => {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    transparent: false,
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
    splashShownAt = Date.now();
    resolve(true);
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
    splashCloseTimer = null;
    stopSplashPulse();
    splashShownAt = 0;
  });
  const logoDataUrl = getSplashLogoDataUrl();
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSplashHtml(logoDataUrl))}`);
  startSplashPulse();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    backgroundColor: "#eef4ff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow = win;
  postSplashProgress({ percent: 15, stage: "Window", message: "Creating main window..." });

  if (isDev) {
    postSplashProgress({ percent: 26, stage: "Dev Server", message: "Connecting to local renderer..." });
    win.loadURL("http://localhost:8081");
  } else {
    postSplashProgress({ percent: 26, stage: "Assets", message: "Loading packaged renderer..." });
    win.loadFile(path.join(__dirname, "..", "desktop", "renderer-dist", "index.html"));
  }

  win.setMenu(null);
  win.once("ready-to-show", () => {
    stopSplashPulse();
    postSplashProgress({ percent: 100, stage: "Ready", message: "Workspace is ready." });
    win.show();
    closeSplashWhenReady(260);
  });

  win.webContents.on("did-start-loading", () => {
    postSplashProgress({ percent: 40, stage: "Renderer", message: "Loading application bundles..." });
  });

  win.webContents.on("did-finish-load", () => {
    postSplashProgress({ percent: 72, stage: "Renderer", message: "Initializing application..." });
  });

  win.webContents.on("did-fail-load", (_event, code, desc) => {
    postSplashProgress({
      percent: 95,
      stage: "Retry",
      message: `Renderer load failed (${code}). ${desc || "Waiting for retry..."}`
    });
  });

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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildNewsFallbackHtml(news) {
  const title = escapeHtml(news?.title || "鏂伴椈璇︽儏");
  const source = escapeHtml(news?.source || "鏈煡鏉ユ簮");
  const publishedAt = escapeHtml(news?.publishedAt || "");
  const url = escapeHtml(news?.url || "");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background: #f8fafc; color: #0f172a; }
      .wrap { max-width: 860px; margin: 0 auto; padding: 32px 24px; }
      .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05); }
      h1 { margin: 0 0 12px; font-size: 28px; line-height: 1.35; }
      .meta { color: #64748b; margin-bottom: 18px; font-size: 14px; }
      .tip { color: #334155; line-height: 1.8; }
      a { color: #2563eb; text-decoration: none; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${title}</h1>
        <div class="meta">${source}${publishedAt ? " 路 " + publishedAt : ""}</div>
        <div class="tip">
          褰撳墠璧勮婧愭湭鎻愪緵鍙洿鎺ュ姞杞界殑缃戦〉姝ｆ枃銆?          ${url ? `<br />鍘熷閾炬帴锛?a href="${url}">${url}</a>` : ""}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function openNewsDetailWindow(news) {
  const detailWindow = new BrowserWindow({
    width: 1024,
    height: 760,
    minWidth: 760,
    minHeight: 520,
    parent: mainWindow || undefined,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rawUrl = typeof news?.url === "string" ? news.url.trim() : "";
  const canLoadRemote = /^https?:\/\//i.test(rawUrl);

  if (canLoadRemote) {
    detailWindow.loadURL(rawUrl).catch(() => {
      const html = buildNewsFallbackHtml(news);
      detailWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });
    return;
  }

  const html = buildNewsFallbackHtml(news);
  detailWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function readShortcut(shortcutPath) {
  try {
    return shell.readShortcutLink(shortcutPath) || {};
  } catch {
    return {};
  }
}

function expandEnvPath(input) {
  if (!input || typeof input !== "string") return "";
  return input.replace(/%([^%]+)%/g, (_m, key) => process.env[key] || "");
}

function normalizeIconPath(rawIconPath) {
  if (!rawIconPath || typeof rawIconPath !== "string") return "";
  const expanded = expandEnvPath(rawIconPath.trim());
  // Shortcut icon strings can be like "C:\\path\\app.exe,0"
  const comma = expanded.lastIndexOf(",");
  const possibleIndex = comma >= 0 ? expanded.slice(comma + 1).trim() : "";
  const isIndex = /^[+-]?\d+$/.test(possibleIndex);
  return isIndex ? expanded.slice(0, comma).trim() : expanded;
}

function tryReadImageAsDataUrl(candidatePath) {
  if (!candidatePath || !fs.existsSync(candidatePath)) return undefined;
  try {
    const img = nativeImage.createFromPath(candidatePath);
    if (img && !img.isEmpty()) {
      return img.toDataURL();
    }
  } catch {
    // Ignore and fallback to app.getFileIcon
  }
  return undefined;
}

async function tryGetFileIconDataUrl(candidatePath) {
  const sizes = ["large", "normal", "small"];
  for (const size of sizes) {
    try {
      const icon = await app.getFileIcon(candidatePath, { size });
      if (icon && !icon.isEmpty()) {
        return icon.toDataURL();
      }
    } catch {
      // Try next size.
    }
  }
  return undefined;
}

async function resolveShortcutIconDataUrl(shortcutPath, targetPath, shortcutMeta) {
  const candidates = [];
  const shortcutIcon = normalizeIconPath(shortcutMeta?.icon || "");
  if (shortcutIcon && fs.existsSync(shortcutIcon)) {
    candidates.push(shortcutIcon);
  }
  if (fs.existsSync(shortcutPath)) {
    candidates.push(shortcutPath);
  }
  if (targetPath && fs.existsSync(targetPath)) {
    candidates.push(targetPath);
  }

  const seen = new Set();
  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const directDataUrl = tryReadImageAsDataUrl(candidate);
    if (directDataUrl) return directDataUrl;

    const shellIconDataUrl = await tryGetFileIconDataUrl(candidate);
    if (shellIconDataUrl) return shellIconDataUrl;
  }
  return undefined;
}

async function scanDesktopApps(event) {
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
      let entries = [];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
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
    const shortcut = readShortcut(link);
    const target = shortcut?.target || "";
    const launchArgs = shortcut?.args || "";
    const dedupeKey = `${target}|${launchArgs}`.toLowerCase();
    if (target && fs.existsSync(target) && !seenTarget.has(dedupeKey)) {
      seenTarget.add(dedupeKey);
      found += 1;
      const name = path.basename(link, ".lnk");
      const iconDataUrl = await resolveShortcutIconDataUrl(link, target, shortcut);
      const uniqueKey = crypto
        .createHash("sha1")
        .update(`${link}|${target}|${launchArgs}`)
        .digest("hex")
        .slice(0, 12);
      result.push({
        id: `desktop-${uniqueKey}`,
        name,
        packageName: `desktop:${path.basename(target).toLowerCase()}`,
        executablePath: target,
        shortcutPath: link,
        launchArgs,
        iconDataUrl
      });
    }
    event.sender.send("desktop:scan-progress", {
      current: i + 1,
      total,
      percent: Math.round(((i + 1) / total) * 100),
      message: `姝ｅ湪鎵弿鐢佃剳杞欢 ${i + 1}/${total}`
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

ipcMain.handle("desktop:splash-progress", async (_event, payload) => {
  postSplashProgress({
    percent: payload?.percent,
    stage: payload?.stage || "Loading",
    message: payload?.message || "Preparing data..."
  });
  return { ok: true };
});

ipcMain.handle("desktop:open-news-detail", async (_event, news) => {
  openNewsDetailWindow(news);
  return { ok: true };
});

ipcMain.handle("desktop:launch-app", async (_event, appInfo) => {
  if (appInfo?.shortcutPath && fs.existsSync(appInfo.shortcutPath)) {
    const openResult = await shell.openPath(appInfo.shortcutPath);
    if (!openResult) {
      return { ok: true };
    }
  }

  if (appInfo?.executablePath && fs.existsSync(appInfo.executablePath)) {
    const openResult = await shell.openPath(appInfo.executablePath);
    if (!openResult) {
      return { ok: true };
    }

    const parsedArgs = typeof appInfo?.launchArgs === "string"
      ? appInfo.launchArgs.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg) => arg.replace(/^"(.*)"$/, "$1")) || []
      : [];

    spawn(appInfo.executablePath, parsedArgs, {
      detached: true,
      stdio: "ignore",
      shell: false,
      windowsHide: true
    }).unref();
    return { ok: true };
  }
  if (appInfo?.launchUri) {
    await shell.openExternal(appInfo.launchUri);
    return { ok: true };
  }
  throw new Error("鏈壘鍒板彲鍚姩璺緞");
});

app.whenReady().then(async () => {
  postSplashProgress({ percent: 4, stage: "Bootstrapping", message: "Starting desktop shell..." });
  await createSplashWindow();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

