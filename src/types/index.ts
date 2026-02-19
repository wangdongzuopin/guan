export type AccessibilityMode = "normal" | "elderly" | "blind";

export type InstalledApp = {
  id: string;
  name: string;
  packageName: string;
  launchUri?: string;
  executablePath?: string;
  shortcutPath?: string;
  launchArgs?: string;
  iconDataUrl?: string;
};

export type ScanProgress = {
  phase: "cache" | "scan";
  current: number;
  total: number;
  percent: number;
  message: string;
};

export type NewsCategory = "national" | "technology" | "lifestyle";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  category: NewsCategory;
  url?: string;
};
