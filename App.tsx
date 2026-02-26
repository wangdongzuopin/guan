import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./global.css";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppItem } from "./src/components/AppItem";
import { ModeSwitcher } from "./src/components/ModeSwitcher";
import { NewsPanel } from "./src/components/NewsPanel";
import {
  forceStopDesktopApp,
  getDesktopRuntimeStats,
  initializeInstalledApps,
  launchApp
} from "./src/services/appScanner";
import { getHotNews } from "./src/services/newsService";
import {
  AccessibilityMode,
  AppRuntimeStat,
  AppRuntimeStatus,
  InstalledApp,
  NewsCategory,
  NewsItem,
  ScanProgress
} from "./src/types";

const DEFAULT_CATEGORY: NewsCategory = "national";
const APP_ORDER_STORAGE_KEY = "app_collection_desktop_order_v1";
const APP_GROUP_STORAGE_KEY = "app_collection_desktop_group_v1";
const APP_PINNED_STORAGE_KEY = "app_collection_desktop_pinned_v1";
const NAV_COLLAPSE_STORAGE_KEY = "app_collection_nav_collapsed_v1";
const STARTING_TIMEOUT_MS = 12_000;

const GROUP_KEYS = ["office", "development", "system", "other"] as const;
type GroupKey = (typeof GROUP_KEYS)[number];

function createStoppedRuntime(appId: string): AppRuntimeStat {
  return {
    appId,
    status: "stopped",
    cpuUsage: 0,
    memoryUsageMB: 0,
    processIds: [],
    recommendedToClose: false
  };
}

if (Platform.OS === "web") {
  require("./src/styles/web.css");
}

function resolveColumns(width: number): number {
  if (width >= 1600) return 8;
  if (width >= 1400) return 7;
  if (width >= 1200) return 6;
  if (width >= 1000) return 5;
  if (width >= 800) return 4;
  return 3;
}

function detectGroup(app: InstalledApp): GroupKey {
  const text = `${app.name} ${app.packageName}`.toLowerCase();
  if (
    text.includes("excel") ||
    text.includes("word") ||
    text.includes("ppt") ||
    text.includes("wechat") ||
    text.includes("mail") ||
    text.includes("doc")
  ) {
    return "office";
  }
  if (
    text.includes("code") ||
    text.includes("studio") ||
    text.includes("git") ||
    text.includes("node") ||
    text.includes("python") ||
    text.includes("terminal")
  ) {
    return "development";
  }
  if (
    text.includes("settings") ||
    text.includes("system") ||
    text.includes("control") ||
    text.includes("cmd") ||
    text.includes("powershell")
  ) {
    return "system";
  }
  return "other";
}

function moveId(ids: string[], fromId: string, toId: string): string[] {
  const next = [...ids];
  const from = next.indexOf(fromId);
  const to = next.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const GROUP_LABEL: Record<GroupKey, string> = {
  office: "\u529e\u516c",
  development: "\u5f00\u53d1",
  system: "\u7cfb\u7edf",
  other: "\u5176\u4ed6"
};

const NAV_ITEMS: Array<{ key: GroupKey | "all"; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "all", label: "\u5168\u90e8", icon: "apps-outline" },
  { key: "office", label: "\u529e\u516c", icon: "briefcase-outline" },
  { key: "development", label: "\u5f00\u53d1", icon: "code-slash-outline" },
  { key: "system", label: "\u7cfb\u7edf", icon: "settings-outline" },
  { key: "other", label: "\u5176\u4ed6", icon: "albums-outline" }
];

export default function App() {
  const { width } = useWindowDimensions();
  const isElectronRuntime = Platform.OS === "web" && typeof window !== "undefined" && !!window.electronAPI;
  const [mode, setMode] = useState<AccessibilityMode>("normal");
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, GroupKey>>({});
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupKey | "all">("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSuppressUntil, setDragSuppressUntil] = useState(0);
  const [groupEditor, setGroupEditor] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [newsVisible, setNewsVisible] = useState(!isElectronRuntime);
  const [newsCategory, setNewsCategory] = useState<NewsCategory>(DEFAULT_CATEGORY);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [scanFromCache, setScanFromCache] = useState(false);
  const [query, setQuery] = useState("");
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    phase: "scan",
    current: 0,
    total: 1,
    percent: 0,
    message: "\u7b49\u5f85\u626b\u63cf"
  });
  const [pendingBlindAppId, setPendingBlindAppId] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(isElectronRuntime);
  const [runtimeStats, setRuntimeStats] = useState<Record<string, AppRuntimeStat>>({});
  const [startingAtMap, setStartingAtMap] = useState<Record<string, number>>({});
  const [stoppingIds, setStoppingIds] = useState<string[]>([]);

  const fontScale = useMemo(() => (mode === "elderly" ? 1.35 : 1), [mode]);
  const cardScale = useMemo(() => (mode === "elderly" ? 1.2 : 1), [mode]);
  const isDesktopLayout = width >= 1024;
  const navWidth = isDesktopLayout ? (navCollapsed ? 90 : 240) : 0;
  const rightWidth = isDesktopLayout && newsVisible ? 380 : 0;
  const mainPanelWidth = Math.max(width - navWidth - rightWidth - 64, 300);
  const gridColumns = resolveColumns(mainPanelWidth);
  const itemWidth = Math.floor((mainPanelWidth - (gridColumns - 1) * 20) / gridColumns);
  const webDragEnabled = false;
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const resolveGroup = (app: InstalledApp): GroupKey => groupOverrides[app.id] || detectGroup(app);

  useEffect(() => {
    (async () => {
      try {
        const [savedGroups, savedNav, savedPinned] = await Promise.all([
          AsyncStorage.getItem(APP_GROUP_STORAGE_KEY),
          AsyncStorage.getItem(NAV_COLLAPSE_STORAGE_KEY),
          AsyncStorage.getItem(APP_PINNED_STORAGE_KEY)
        ]);
        if (savedGroups) {
          setGroupOverrides(JSON.parse(savedGroups) as Record<string, GroupKey>);
        }
        if (savedNav) {
          setNavCollapsed(savedNav === "1");
        }
        if (savedPinned) {
          setPinnedIds(JSON.parse(savedPinned) as string[]);
        }
      } catch {
        // Ignore persisted settings read errors.
      }
    })();
  }, []);

  const groupedApps = useMemo(() => {
    const byId = new Map(apps.map((app) => [app.id, app]));
    const sorted = orderedIds.map((id) => byId.get(id)).filter(Boolean) as InstalledApp[];
    const remain = apps.filter((app) => !orderedIds.includes(app.id));
    const all = [...sorted, ...remain];
    const unpinned = all.filter((app) => !pinnedSet.has(app.id));

    const keyword = query.trim().toLowerCase();
    const filtered = keyword
      ? unpinned.filter(
        (app) =>
          app.name.toLowerCase().includes(keyword) || app.packageName.toLowerCase().includes(keyword)
      )
      : unpinned;

    const groups: Record<GroupKey, InstalledApp[]> = {
      office: [],
      development: [],
      system: [],
      other: []
    };
    for (const app of filtered) {
      groups[resolveGroup(app)].push(app);
    }
    return groups;
  }, [apps, orderedIds, query, groupOverrides, pinnedSet]);

  const pinnedApps = useMemo(() => {
    const byId = new Map(apps.map((app) => [app.id, app]));
    const keyword = query.trim().toLowerCase();
    return pinnedIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter((app): app is InstalledApp => {
        if (!app) return false;
        if (!keyword) return true;
        const text = `${app.name} ${app.packageName}`.toLowerCase();
        return text.includes(keyword);
      });
  }, [apps, pinnedIds, query]);

  const groupCounts = useMemo(
    () => ({
      all: GROUP_KEYS.reduce((sum, key) => sum + groupedApps[key].length, 0),
      office: groupedApps.office.length,
      development: groupedApps.development.length,
      system: groupedApps.system.length,
      other: groupedApps.other.length
    }),
    [groupedApps]
  );

  const visibleGroups: GroupKey[] =
    activeGroup === "all" ? GROUP_KEYS.filter((g) => groupedApps[g].length > 0) : [activeGroup];

  const selectedApp = useMemo(
    () => apps.find((app) => app.id === selectedAppId) || null,
    [apps, selectedAppId]
  );

  const resolveRuntimeForApp = useCallback(
    (app: InstalledApp): AppRuntimeStat => {
      const runtime = runtimeStats[app.id];
      if (runtime?.status === "running") return runtime;
      if (startingAtMap[app.id]) {
        return {
          ...(runtime || createStoppedRuntime(app.id)),
          status: "starting"
        };
      }
      return runtime || createStoppedRuntime(app.id);
    },
    [runtimeStats, startingAtMap]
  );

  const runtimeSummary = useMemo(() => {
    let starting = 0;
    let running = 0;
    let stopped = 0;
    let recommended = 0;

    for (const app of apps) {
      const runtime = runtimeStats[app.id];
      const status: AppRuntimeStatus =
        runtime?.status === "running" ? "running" : startingAtMap[app.id] ? "starting" : "stopped";

      if (status === "running") running += 1;
      else if (status === "starting") starting += 1;
      else stopped += 1;

      if (runtime?.recommendedToClose) {
        recommended += 1;
      }
    }

    return { starting, running, stopped, recommended };
  }, [apps, runtimeStats, startingAtMap]);

  const recommendedApps = useMemo(() => {
    return apps.filter((app) => runtimeStats[app.id]?.recommendedToClose);
  }, [apps, runtimeStats]);

  const refreshRuntimeStats = useCallback(
    async (targetApps?: InstalledApp[]) => {
      const scopedApps = targetApps || apps;
      if (!isElectronRuntime || scopedApps.length === 0) {
        setRuntimeStats({});
        setStartingAtMap({});
        setStoppingIds([]);
        return;
      }

      try {
        const stats = await getDesktopRuntimeStats(scopedApps);
        const nextMap: Record<string, AppRuntimeStat> = {};
        for (const item of stats) {
          if (!item?.appId) continue;
          nextMap[item.appId] = item;
        }
        setRuntimeStats(nextMap);

        const validIds = new Set(scopedApps.map((item) => item.id));
        const now = Date.now();
        setStartingAtMap((old) => {
          const next: Record<string, number> = {};
          for (const [id, startedAt] of Object.entries(old)) {
            if (!validIds.has(id)) continue;
            if (nextMap[id]?.status === "running") continue;
            if (now - startedAt > STARTING_TIMEOUT_MS) continue;
            next[id] = startedAt;
          }
          return next;
        });
      } catch {
        // Ignore runtime refresh errors.
      }
    },
    [apps, isElectronRuntime]
  );

  const stopApps = useCallback(
    async (targets: InstalledApp[]) => {
      if (!isElectronRuntime || targets.length === 0) return;

      const targetIds = targets.map((item) => item.id);
      setStoppingIds((old) => Array.from(new Set([...old, ...targetIds])));

      let failedCount = 0;
      for (const app of targets) {
        try {
          const processIds = runtimeStats[app.id]?.processIds || [];
          await forceStopDesktopApp(app, processIds);
        } catch {
          failedCount += 1;
        }
      }

      setStoppingIds((old) => old.filter((id) => !targetIds.includes(id)));
      setStartingAtMap((old) => {
        const next = { ...old };
        for (const id of targetIds) {
          delete next[id];
        }
        return next;
      });
      await refreshRuntimeStats();

      if (failedCount > 0) {
        Alert.alert("部分应用未停止", `${failedCount} 个应用停止失败，请稍后重试`);
      }
    },
    [isElectronRuntime, refreshRuntimeStats, runtimeStats]
  );

  useEffect(() => {
    if (!isElectronRuntime || apps.length === 0) {
      setRuntimeStats({});
      setStartingAtMap({});
      setStoppingIds([]);
      return;
    }

    void refreshRuntimeStats(apps);
    const timer = setInterval(() => {
      void refreshRuntimeStats(apps);
    }, 2500);

    return () => clearInterval(timer);
  }, [apps, isElectronRuntime, refreshRuntimeStats]);

  const loadInstalledApps = async (forceRescan = false) => {
    setScanLoading(true);
    const result = await initializeInstalledApps({
      forceRescan,
      onProgress: setScanProgress
    });
    setApps(result.apps);
    const incoming = result.apps.map((item) => item.id);
    try {
      const savedOrderRaw = await AsyncStorage.getItem(APP_ORDER_STORAGE_KEY);
      const savedOrder = savedOrderRaw ? (JSON.parse(savedOrderRaw) as string[]) : [];
      const keep = savedOrder.filter((id) => incoming.includes(id));
      const appended = incoming.filter((id) => !keep.includes(id));
      setOrderedIds([...keep, ...appended]);
      setPinnedIds((old) => {
        const next = old.filter((id) => incoming.includes(id));
        void AsyncStorage.setItem(APP_PINNED_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      setOrderedIds(incoming);
    }
    setScanFromCache(result.fromCache);
    setScanLoading(false);
  };

  useEffect(() => {
    void loadInstalledApps(false);
  }, []);

  const loadNews = async (category: NewsCategory) => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const data = await getHotNews(category);
      setNewsList(data);
      if (data.length === 0) setNewsError("\u5f53\u524d\u5206\u7c7b\u6682\u65e0\u8d44\u8baf");
    } catch {
      setNewsError("\u8d44\u8baf\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
      setNewsList([]);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    void loadNews(newsCategory);
  }, [newsCategory]);

  const openNewsDetail = async (item: NewsItem) => {
    const link = (item.url || "").trim();
    if (Platform.OS === "web" && typeof window !== "undefined" && window.electronAPI?.openNewsDetail) {
      try {
        await window.electronAPI.openNewsDetail({
          title: item.title,
          source: item.source,
          publishedAt: item.publishedAt,
          url: item.url
        });
        return;
      } catch {
        // Fallback to browser open below.
      }
    }

    if (!link) {
      Alert.alert("暂无详情", "当前资讯没有可打开的详情链接");
      return;
    }

    if (Platform.OS === "web") {
      globalThis?.window?.open?.(link, "_blank");
      return;
    }

    const canOpen = await Linking.canOpenURL(link);
    if (canOpen) {
      await Linking.openURL(link);
    } else {
      Alert.alert("打开失败", "当前设备无法打开该资讯链接");
    }
  };

  const onAppPress = async (app: InstalledApp) => {
    if (Date.now() < dragSuppressUntil || draggingId) {
      return;
    }

    if (groupEditor) {
      setSelectedAppId(app.id);
      return;
    }

    if (mode === "blind") {
      if (pendingBlindAppId !== app.id) {
        setPendingBlindAppId(app.id);
        Speech.stop();
        Speech.speak(`${app.name}\uff0c\u518d\u6b21\u70b9\u51fb\u5373\u53ef\u6253\u5f00\u5e94\u7528`, {
          language: "zh-CN",
          rate: 0.95
        });
        return;
      }
      setPendingBlindAppId(null);
    }

    try {
      if (isElectronRuntime) {
        setStartingAtMap((old) => ({
          ...old,
          [app.id]: Date.now()
        }));
      }
      await launchApp(app);
      if (isElectronRuntime) {
        setTimeout(() => {
          void refreshRuntimeStats();
        }, 500);
      }
    } catch (error: any) {
      Alert.alert("\u6253\u5f00\u5931\u8d25", error?.message || `\u65e0\u6cd5\u6253\u5f00 ${app.name}`);
    }
  };

  const onDropReorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setOrderedIds((old) => {
      const next = moveId(old, draggingId, targetId);
      void AsyncStorage.setItem(APP_ORDER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setDraggingId(null);
    setDragOverId(null);
  };

  const resetOrder = () => {
    const natural = apps.map((app) => app.id);
    setOrderedIds(natural);
    void AsyncStorage.setItem(APP_ORDER_STORAGE_KEY, JSON.stringify(natural));
  };

  const setAppGroup = (appId: string, group: GroupKey) => {
    setGroupOverrides((old) => {
      const next = { ...old, [appId]: group };
      void AsyncStorage.setItem(APP_GROUP_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const togglePinned = (app: InstalledApp) => {
    setPinnedIds((old) => {
      const exists = old.includes(app.id);
      const next = exists ? old.filter((id) => id !== app.id) : [app.id, ...old];
      void AsyncStorage.setItem(APP_PINNED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleNavCollapsed = () => {
    setNavCollapsed((old) => {
      const next = !old;
      void AsyncStorage.setItem(NAV_COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    if (!isElectronRuntime) return;
    if (scanLoading || newsLoading) {
      setBootLoading(true);
      return;
    }
    const timer = setTimeout(() => setBootLoading(false), 300);
    return () => clearTimeout(timer);
  }, [isElectronRuntime, scanLoading, newsLoading]);

  useEffect(() => {
    if (!isElectronRuntime || !window.electronAPI?.setSplashProgress) return;
    const percent = scanLoading ? Math.max(10, Math.min(96, Math.round(scanProgress.percent))) : 100;
    const stage = scanLoading ? "Scanning" : newsLoading ? "News" : "Ready";
    const message = scanLoading
      ? (scanProgress.message || "Scanning installed applications...")
      : newsLoading
        ? "Loading hot news..."
        : "Workspace ready.";

    void window.electronAPI.setSplashProgress({
      percent,
      stage,
      message
    });
  }, [isElectronRuntime, scanLoading, newsLoading, scanProgress.percent, scanProgress.message]);

  return (
    <SafeAreaProvider>
      <View className="flex-1 mesh-bg">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        {bootLoading && (
          <View className="absolute inset-0 z-[80] items-center justify-center bg-slate-950/35 backdrop-blur-sm">
            <View className="w-[320px] rounded-3xl bg-white/95 border border-brand-100 p-6 shadow-2xl">
              <View className="flex-row items-center">
                <View className="h-10 w-10 rounded-2xl bg-brand-600 items-center justify-center mr-3">
                  <Ionicons name="sparkles" size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-base font-bold text-slate-800">Loading Resources</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">Preparing Electron workspace...</Text>
                </View>
              </View>
              <View className="mt-5">
                <View className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <View
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-500 transition-all duration-300"
                    style={{ width: `${Math.max(8, Math.round(scanProgress.percent))}%` }}
                  />
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-brand-700">{Math.round(scanProgress.percent)}%</Text>
                  <View className="flex-row items-center">
                    <View className="h-2 w-2 rounded-full bg-brand-400 animate-pulse mr-1.5" />
                    <View className="h-2 w-2 rounded-full bg-brand-500 animate-pulse mr-1.5" />
                    <View className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        <View className="flex-1 flex-col p-4 md:p-6 max-w-[1920px] mx-auto w-full h-full">

          {/* Top Bar */}
          <View className="bg-white/75 glass-panel rounded-[2rem] p-5 mb-7 flex-row items-center justify-between z-20">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 rounded-2xl bg-gradient-brand items-center justify-center shadow-lg shadow-brand-500/30">
                <Image
                  source={require("./logo.jpeg")}
                  style={{ width: 36, height: 36, borderRadius: 8 }}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={{ fontSize: 30 * fontScale }} className="font-bold text-slate-800 tracking-tight">guan</Text>
                <Text style={{ fontSize: 15 * fontScale }} className="text-slate-500 font-semibold tracking-wide">Workspace</Text>
              </View>
            </View>

            <View className="hidden md:flex flex-1 max-w-xl mx-8">
              <View className="flex-row items-center bg-slate-100/80 rounded-2xl border border-slate-200 px-4 py-2.5 focus-within:bg-white focus-within:border-brand-500 focus-within:shadow-md transition-all">
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-3 text-base text-slate-700 outline-none"
                  placeholder="搜索应用..."
                  placeholderTextColor="#94a3b8"
                  value={query}
                  onChangeText={setQuery}
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                  </Pressable>
                )}
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setNewsVisible(v => !v)}
                className={`h-12 w-12 rounded-xl items-center justify-center transition-all ${newsVisible ? 'bg-brand-50 text-brand-600 border border-brand-200 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100'
                  }`}
              >
                <Ionicons name={newsVisible ? "newspaper" : "newspaper-outline"} size={22} color={newsVisible ? "#58abed" : "#64748b"} />
              </Pressable>

              <View className="h-6 w-[1px] bg-slate-200" />

              <ModeSwitcher mode={mode} onChange={setMode} />
            </View>
          </View>

          {/* Main Layout */}
          <View className="flex-1 flex-row gap-6 overflow-hidden">

            {/* Sidebar */}
            {isDesktopLayout && (
              <View className={`transition-all duration-500 ease-in-out ${navCollapsed ? 'w-[100px]' : 'w-[280px]'}`}>
                <View className="h-full glass-panel rounded-[2rem] flex-col p-5 relative border border-white/60 shadow-xl shadow-indigo-500/5">
                  <View className={`flex-row items-center mb-8 px-2 ${navCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!navCollapsed && (
                      <View className="flex-row items-center">
                        <View className="h-9 w-9 rounded-xl bg-brand-100 items-center justify-center mr-3 border border-brand-200">
                          <Ionicons name="layers" size={20} color="#58abed" />
                        </View>
                        <Text className="text-lg font-bold text-slate-800 tracking-tight">分类导航</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={toggleNavCollapsed}
                      className={`rounded-xl p-2.5 hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors ${navCollapsed ? '' : 'bg-transparent'}`}
                    >
                      <Ionicons name={navCollapsed ? "menu" : "chevron-back"} size={20} color="#64748b" />
                    </Pressable>
                  </View>

                  <View className="space-y-3">
                    {NAV_ITEMS.map((item) => {
                      const isActive = activeGroup === item.key;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setActiveGroup(item.key)}
                          className={`group flex-row items-center px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
                              ? 'bg-brand-600 shadow-lg shadow-brand-500/30 translate-x-1'
                              : 'hover:bg-white/60 hover:shadow-sm hover:translate-x-1 bg-transparent'
                            }`}
                        >
                          <View className={`items-center justify-center w-6`}>
                            <Ionicons
                              name={isActive ? item.icon.replace('-outline', '') as any : item.icon}
                              size={22}
                              color={isActive ? "white" : "#64748b"}
                            />
                          </View>

                          {!navCollapsed && (
                            <>
                              <Text className={`ml-3.5 font-bold text-[15px] flex-1 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                {item.label}
                              </Text>
                              <View className={`px-2.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                  {groupCounts[item.key as keyof typeof groupCounts]}
                                </Text>
                              </View>
                            </>
                          )}

                          {/* Tooltip hint for collapsed mode */}
                          {navCollapsed && (
                            <View className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                              <Text className="text-white text-xs font-bold">{item.label}</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View className="mt-auto space-y-3 pt-6 border-t border-slate-100/60 w-full">
                    <Pressable
                      onPress={() => setGroupEditor(v => !v)}
                      className={`flex-row items-center px-4 py-3.5 rounded-2xl transition-all duration-300 w-full ${groupEditor
                          ? 'bg-brand-50 border border-brand-100 shadow-sm'
                          : 'hover:bg-white/60 border border-transparent'
                        }`}
                    >
                      <View className={`items-center justify-center w-6`}>
                        <Ionicons
                          name={groupEditor ? "folder-open" : "folder-open-outline"}
                          size={22}
                          color={groupEditor ? "#58abed" : "#64748b"}
                        />
                      </View>
                      {!navCollapsed && (
                        <View className="ml-3.5 flex-1">
                          <Text className={`font-bold text-[14px] ${groupEditor ? "text-brand-700" : "text-slate-600"}`}>
                            分组管理
                          </Text>
                          <Text className="text-[10px] text-slate-400 mt-0.5">Custom Groups</Text>
                        </View>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => void loadInstalledApps(true)}
                      className="flex-row items-center px-4 py-3.5 rounded-2xl hover:bg-white/60 transition-all duration-300 w-full"
                    >
                      <View className={`items-center justify-center w-6 ${scanLoading ? "animate-spin-slow" : ""}`}>
                        <Ionicons name="scan-outline" size={22} color="#64748b" />
                      </View>
                      {!navCollapsed && (
                        <View className="ml-3.5 flex-1">
                          <Text className="font-bold text-[14px] text-slate-600">重新扫描</Text>
                          <Text className="text-[10px] text-slate-400 mt-0.5">
                            {scanLoading ? `Scanning ${Math.round(scanProgress.percent)}%` : "Refresh Apps"}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Grid Area */}
            <View className="flex-1 flex-col overflow-hidden">
              {/* Scan Progress */}
              {scanLoading && (
                <View className="mb-4 bg-white/40 h-1 w-full rounded-full overflow-hidden">
                  <View
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-300"
                    style={{ width: `${scanProgress.percent}%` }}
                  />
                </View>
              )}

              {/* Group Editor Overlay */}
              {groupEditor && selectedApp && (
                <View className="mb-6 mx-1 glass p-6 rounded-3xl border border-white/60 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
                  <View className="absolute top-0 right-0 p-4 opacity-10">
                    <Ionicons name="folder-open" size={120} color="#58abed" />
                  </View>
                  <View className="flex-row items-center justify-between mb-6">
                    <View>
                      <Text className="text-xl font-bold text-slate-800">编辑分组</Text>
                      <Text className="text-slate-500 mt-1">为 <Text className="font-bold text-brand-600">{selectedApp.name}</Text> 选择一个合适的分类</Text>
                    </View>
                    <Pressable onPress={() => setSelectedAppId(null)} className="p-2 hover:bg-black/5 rounded-full">
                      <Ionicons name="close" size={24} color="#64748b" />
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {GROUP_KEYS.map((key) => {
                      const isActive = resolveGroup(selectedApp) === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setAppGroup(selectedApp.id, key)}
                          className={`px-6 py-3 rounded-xl border transition-all ${isActive
                            ? 'bg-brand-600 border-brand-600 shadow-lg shadow-brand-500/30'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
                            }`}
                        >
                          <Text className={`font-semibold ${isActive ? 'text-white' : 'text-slate-600'}`}>
                            {GROUP_LABEL[key]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Main App Grid Container with Glass Panel */}
              <View className="flex-1 glass-panel rounded-[2rem] border border-white/60 overflow-hidden relative">
                {scanLoading && (
                  <View className="absolute top-4 right-5 z-20 rounded-2xl bg-white/90 border border-brand-100 px-4 py-3 shadow-lg">
                    <View className="flex-row items-center">
                      <View className="h-5 w-5 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin mr-2" />
                      <Text className="text-xs font-bold text-brand-700">
                        Loading {Math.round(scanProgress.percent)}%
                      </Text>
                    </View>
                    <View className="mt-2 flex-row items-center">
                      <View className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse mr-1.5" />
                      <View className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse mr-1.5" />
                      <View className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse" />
                    </View>
                  </View>
                )}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  className="flex-1 px-6 pt-6"
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  {pinnedApps.length > 0 && (
                    <View className="mb-8">
                      <View className="flex-row items-center mb-4 pl-1 border-b border-amber-100 pb-2">
                        <View className="h-6 w-1 rounded-full bg-amber-500 mr-3" />
                        <Text className="text-lg font-bold text-slate-800 tracking-tight mr-3">置顶应用</Text>
                        <View className="bg-amber-50 px-2.5 py-0.5 rounded-full">
                          <Text className="text-xs font-bold text-amber-600">{pinnedApps.length}</Text>
                        </View>
                      </View>
                      <View className="flex-row flex-wrap gap-4">
                        {pinnedApps.map((app) => (
                          (() => {
                            const runtime = resolveRuntimeForApp(app);
                            const stopping = stoppingIds.includes(app.id);
                            return (
                              <AppItem
                                key={app.id}
                                app={app}
                                fontScale={fontScale}
                                cardScale={cardScale}
                                itemWidth={itemWidth - 24}
                                groupLabel={GROUP_LABEL[resolveGroup(app)]}
                                selected={selectedAppId === app.id}
                                pinned
                                dragEnabled={false}
                                runtime={runtime}
                                canForceStop={runtime.status === "running" && !stopping}
                                stopping={stopping}
                                onTogglePinned={togglePinned}
                                onForceStop={(target) => void stopApps([target])}
                                onPress={onAppPress}
                                onLongPress={(target) => setSelectedAppId(target.id)}
                              />
                            );
                          })()
                        ))}
                      </View>
                    </View>
                  )}

                  {visibleGroups.map((group) => (
                    <View key={group} className="mb-8">
                      <View className="flex-row items-center mb-4 pl-1 border-b border-slate-100 pb-2">
                        <View className="h-6 w-1 rounded-full bg-brand-500 mr-3" />
                        <Text className="text-lg font-bold text-slate-800 tracking-tight mr-3">
                          {GROUP_LABEL[group]}
                        </Text>
                        <View className="bg-slate-100 px-2.5 py-0.5 rounded-full">
                          <Text className="text-xs font-bold text-slate-500">{groupedApps[group].length}</Text>
                        </View>
                      </View>

                      <View className="flex-row flex-wrap gap-4">
                        {groupedApps[group].map((app) => (
                          (() => {
                            const runtime = resolveRuntimeForApp(app);
                            const stopping = stoppingIds.includes(app.id);
                            return (
                              <AppItem
                                key={app.id}
                                app={app}
                                fontScale={fontScale}
                                cardScale={cardScale}
                                itemWidth={itemWidth - 24} // Adjusted for padding
                                groupLabel={GROUP_LABEL[resolveGroup(app)]}
                                selected={selectedAppId === app.id}
                                pinned={pinnedSet.has(app.id)}
                                dragEnabled={false}
                                dragHint={
                                  webDragEnabled
                                    ? dragOverId === app.id
                                      ? "\u653e\u7f6e\u5230\u8fd9\u91cc"
                                      : "\u62d6\u62fd\u6392\u5e8f"
                                    : "\u6392\u5e8f"
                                }
                                runtime={runtime}
                                canForceStop={runtime.status === "running" && !stopping}
                                stopping={stopping}
                                onTogglePinned={togglePinned}
                                onForceStop={(target) => void stopApps([target])}
                                webDragProps={undefined}
                                onPress={onAppPress}
                                onLongPress={(target) => setSelectedAppId(target.id)}
                              />
                            );
                          })()
                        ))}
                      </View>
                    </View>
                  ))}

                  {visibleGroups.length === 0 && (
                    <View className="flex-1 items-center justify-center min-h-[400px]">
                      <View className="h-24 w-24 rounded-full bg-slate-50 items-center justify-center mb-4">
                        <Ionicons name="search" size={40} color="#cbd5e1" />
                      </View>
                      <Text className="text-slate-400 font-medium text-lg">未找到匹配的应用</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* News Panel */}
            {newsVisible && (
              <View className={`${isDesktopLayout ? "w-[380px]" : "w-full"} animate-fade-in`}>
                <NewsPanel
                  current={newsCategory}
                  data={newsList}
                  loading={newsLoading}
                  error={newsError}
                  fontScale={fontScale}
                  onChangeCategory={setNewsCategory}
                  onRefresh={() => void loadNews(newsCategory)}
                  onOpenDetail={(item) => void openNewsDetail(item)}
                />
              </View>
            )}

          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
}



