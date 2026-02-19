import { InstalledApp } from "./index";

type DesktopScanProgress = {
  current: number;
  total: number;
  percent: number;
  message: string;
};

type NewsDetailPayload = {
  title: string;
  source: string;
  publishedAt: string;
  url?: string;
};

type SplashProgressPayload = {
  percent: number;
  stage?: string;
  message?: string;
};

declare global {
  interface Window {
    electronAPI?: {
      scanApps: () => Promise<InstalledApp[]>;
      launchApp: (appInfo: InstalledApp) => Promise<{ ok: boolean }>;
      openNewsDetail: (news: NewsDetailPayload) => Promise<{ ok: boolean }>;
      setSplashProgress: (payload: SplashProgressPayload) => Promise<{ ok: boolean }>;
      onScanProgress: (callback: (payload: DesktopScanProgress) => void) => () => void;
    };
  }
}

export {};
