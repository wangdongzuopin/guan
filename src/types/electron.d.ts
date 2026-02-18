import { InstalledApp } from "./index";

type DesktopScanProgress = {
  current: number;
  total: number;
  percent: number;
  message: string;
};

declare global {
  interface Window {
    electronAPI?: {
      scanApps: () => Promise<InstalledApp[]>;
      launchApp: (appInfo: InstalledApp) => Promise<{ ok: boolean }>;
      onScanProgress: (callback: (payload: DesktopScanProgress) => void) => () => void;
    };
  }
}

export {};
