import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import { InstalledApp, ScanProgress } from "../types";
import desktopApps from "../cache/desktopApps.generated.json";

const CACHE_VERSION = "v6";
const CACHE_PREFIX = "app_collection_scan_cache";

const fallbackMobileApps: InstalledApp[] = [
  { id: "wx", name: "WeChat", packageName: "com.tencent.mm" },
  { id: "qq", name: "QQ", packageName: "com.tencent.mobileqq" },
  { id: "browser", name: "Browser", packageName: "com.android.browser" },
  { id: "map", name: "Amap", packageName: "com.autonavi.minimap" }
];

const fallbackDesktopApps: InstalledApp[] = [
  { id: "desktop-vscode", name: "VS Code", packageName: "desktop:vscode", launchUri: "vscode://" },
  {
    id: "desktop-edge",
    name: "Microsoft Edge",
    packageName: "desktop:edge",
    launchUri: "microsoft-edge:https://www.bing.com"
  },
  {
    id: "desktop-settings",
    name: "Windows Settings",
    packageName: "desktop:settings",
    launchUri: "ms-settings:"
  }
];

type InitScanResult = {
  apps: InstalledApp[];
  fromCache: boolean;
  platformBucket: "android" | "ios" | "desktop";
};

function getPlatformBucket(): InitScanResult["platformBucket"] {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.electronAPI) {
    return "desktop";
  }
  if (Platform.OS === "android") return "android";
  if (Platform.OS === "ios") return "ios";
  return "desktop";
}

function toFileUri(path: string): string {
  return `file:///${path.replace(/\\/g, "/").replace(/\s/g, "%20")}`;
}

function emitProgress(
  onProgress: ((progress: ScanProgress) => void) | undefined,
  phase: "cache" | "scan",
  current: number,
  total: number,
  message: string
) {
  if (!onProgress) return;
  const safeTotal = Math.max(total, 1);
  onProgress({
    phase,
    current,
    total: safeTotal,
    percent: Math.min(100, Math.round((current / safeTotal) * 100)),
    message
  });
}

function normalizeDesktopApps(raw: any[]): InstalledApp[] {
  return raw
    .map((item, index) => {
      const executablePath = typeof item?.executablePath === "string" ? item.executablePath : "";
      const launchUri =
        typeof item?.launchUri === "string" && item.launchUri
          ? item.launchUri
          : executablePath
            ? toFileUri(executablePath)
            : undefined;

      return {
        id: `${item?.id || item?.packageName || item?.name || index}`,
        name: item?.name || item?.packageName || "Desktop App",
        packageName: item?.packageName || `desktop:${index}`,
        launchUri,
        executablePath: executablePath || undefined,
        shortcutPath: typeof item?.shortcutPath === "string" ? item.shortcutPath : undefined,
        launchArgs: typeof item?.launchArgs === "string" ? item.launchArgs : undefined,
        iconDataUrl: typeof item?.iconDataUrl === "string" ? item.iconDataUrl : undefined
      };
    })
    .filter((item) => !!item.name);
}

function ensureUniqueAppIds(items: InstalledApp[]): InstalledApp[] {
  const counter = new Map<string, number>();
  return items.map((item, index) => {
    const base =
      item.id ||
      item.packageName ||
      (item.executablePath ? `path:${item.executablePath}` : "") ||
      `app-${index}`;
    const count = counter.get(base) || 0;
    counter.set(base, count + 1);
    if (count === 0) return item;
    return {
      ...item,
      id: `${base}-${count}`
    };
  });
}

async function scanAndroid(onProgress?: (progress: ScanProgress) => void): Promise<InstalledApp[]> {
  emitProgress(onProgress, "scan", 0, 1, "\u6b63\u5728\u521d\u59cb\u5316 Android \u626b\u63cf\u5668");
  try {
    const sendIntent = require("react-native-send-intent");
    const rawApps =
      (await sendIntent?.getInstalledApps?.()) ||
      (await sendIntent?.getApps?.()) ||
      (await sendIntent?.default?.getInstalledApps?.()) ||
      (await sendIntent?.default?.getApps?.()) ||
      [];

    const source = Array.isArray(rawApps) ? rawApps : [];
    const total = source.length || 1;
    const parsed: InstalledApp[] = [];

    for (let i = 0; i < source.length; i += 1) {
      const item = source[i];
      const packageName = item?.packageName || item?.package || "";
      if (packageName) {
        parsed.push({
          id: `${packageName}-${i}`,
          name: item?.appName || item?.name || packageName,
          packageName
        });
      }
      emitProgress(
        onProgress,
        "scan",
        i + 1,
        total,
        `\u6b63\u5728\u626b\u63cf\u5df2\u5b89\u88c5\u5e94\u7528 ${i + 1}/${total}`
      );
    }

    return parsed.length > 0 ? parsed : fallbackMobileApps;
  } catch {
    emitProgress(onProgress, "scan", 1, 1, "\u626b\u63cf\u5931\u8d25\uff0c\u5df2\u4f7f\u7528\u517c\u5bb9\u5217\u8868");
    return fallbackMobileApps;
  }
}

async function scanDesktop(onProgress?: (progress: ScanProgress) => void): Promise<InstalledApp[]> {
  if (typeof window !== "undefined" && window.electronAPI) {
    const unsubscribe = window.electronAPI.onScanProgress((payload) => {
      emitProgress(onProgress, "scan", payload.current, payload.total, payload.message);
    });
    try {
      const apps = await window.electronAPI.scanApps();
      unsubscribe();
      const normalized = ensureUniqueAppIds(apps);
      if (normalized.length > 0) {
        return normalized;
      }
      return fallbackDesktopApps;
    } catch {
      unsubscribe();
      return fallbackDesktopApps;
    }
  }

  const generated = normalizeDesktopApps(Array.isArray(desktopApps) ? desktopApps : []);
  const source = generated.length > 0 ? generated : fallbackDesktopApps;
  const total = source.length || 1;
  const parsed: InstalledApp[] = [];

  for (let i = 0; i < source.length; i += 1) {
    parsed.push(source[i]);
    emitProgress(
      onProgress,
      "scan",
      i + 1,
      total,
      `\u6b63\u5728\u626b\u63cf\u7535\u8111\u8f6f\u4ef6 ${i + 1}/${total}`
    );
    if (i % 15 === 0) {
      await Promise.resolve();
    }
  }
  return ensureUniqueAppIds(parsed);
}

export async function initializeInstalledApps(options?: {
  forceRescan?: boolean;
  onProgress?: (progress: ScanProgress) => void;
}): Promise<InitScanResult> {
  const platformBucket = getPlatformBucket();
  const cacheKey = `${CACHE_PREFIX}:${CACHE_VERSION}:${platformBucket}`;
  const forceRescan = options?.forceRescan === true;

  if (!forceRescan) {
    const cachedRaw = await AsyncStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cachedApps = ensureUniqueAppIds(JSON.parse(cachedRaw) as InstalledApp[]);
        if (Array.isArray(cachedApps) && cachedApps.length > 0) {
          emitProgress(options?.onProgress, "cache", 1, 1, "\u5df2\u4ece\u7f13\u5b58\u52a0\u8f7d\u5e94\u7528\u5217\u8868");
          return {
            apps: cachedApps,
            fromCache: true,
            platformBucket
          };
        }
      } catch {
        // Ignore invalid cache and continue scanning.
      }
    }
  }

  emitProgress(options?.onProgress, "scan", 0, 1, "\u9996\u6b21\u8fdb\u5165\uff0c\u5f00\u59cb\u626b\u63cf");
  const scannedApps =
    platformBucket === "android"
      ? await scanAndroid(options?.onProgress)
      : await scanDesktop(options?.onProgress);
  const uniqueApps = ensureUniqueAppIds(scannedApps);

  await AsyncStorage.setItem(cacheKey, JSON.stringify(uniqueApps));
  emitProgress(options?.onProgress, "scan", 1, 1, "\u626b\u63cf\u5b8c\u6210");
  return {
    apps: uniqueApps,
    fromCache: false,
    platformBucket
  };
}

export async function launchApp(app: InstalledApp): Promise<void> {
  const knownSchemes: Record<string, string> = {
    "com.tencent.mm": "weixin://",
    "com.tencent.mobileqq": "mqq://",
    "com.autonavi.minimap": "androidamap://"
  };

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.electronAPI) {
      await window.electronAPI.launchApp(app);
      return;
    }

    const uri = app.launchUri || knownSchemes[app.packageName];
    if (!uri) {
      throw new Error("\u5f53\u524d\u8f6f\u4ef6\u4e0d\u652f\u6301\u5728\u6d4f\u89c8\u5668\u76f4\u63a5\u542f\u52a8");
    }
    if (uri.startsWith("file:///")) {
      throw new Error(
        "\u6d4f\u89c8\u5668\u5b89\u5168\u9650\u5236\uff0c\u65e0\u6cd5\u76f4\u63a5\u6253\u5f00\u672c\u5730\u53ef\u6267\u884c\u6587\u4ef6\u3002\u8bf7\u4f7f\u7528\u684c\u9762\u5ba2\u6237\u7aef\u3002"
      );
    }
    try {
      globalThis?.window?.open?.(uri, "_self");
      return;
    } catch {
      throw new Error("\u8be5\u8f6f\u4ef6\u534f\u8bae\u5728\u5f53\u524d\u6d4f\u89c8\u5668\u4e2d\u88ab\u62d2\u7edd");
    }
  }

  if (Platform.OS === "android") {
    try {
      const sendIntent = require("react-native-send-intent");
      if (sendIntent?.openApp) {
        await sendIntent.openApp(app.packageName);
        return;
      }
    } catch {
      // Ignore and try URL schemes below.
    }
  }

  const targetUri = app.launchUri || knownSchemes[app.packageName];
  if (targetUri && (await Linking.canOpenURL(targetUri))) {
    await Linking.openURL(targetUri);
    return;
  }
  throw new Error("\u672a\u627e\u5230\u53ef\u542f\u52a8\u65b9\u5f0f");
}
