import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useState } from "react";
import "./global.css";
import {
  Alert,
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
import { initializeInstalledApps, launchApp } from "./src/services/appScanner";
import { getHotNews } from "./src/services/newsService";
import { AccessibilityMode, InstalledApp, NewsCategory, NewsItem, ScanProgress } from "./src/types";

const DEFAULT_CATEGORY: NewsCategory = "national";
const APP_ORDER_STORAGE_KEY = "app_collection_desktop_order_v1";
const APP_GROUP_STORAGE_KEY = "app_collection_desktop_group_v1";
const NAV_COLLAPSE_STORAGE_KEY = "app_collection_nav_collapsed_v1";

const GROUP_KEYS = ["office", "development", "system", "other"] as const;
type GroupKey = (typeof GROUP_KEYS)[number];

if (Platform.OS === "web") {
  require("./src/styles/web.css");
}

function resolveColumns(width: number): number {
  if (width >= 1500) return 7;
  if (width >= 1300) return 6;
  if (width >= 1120) return 5;
  if (width >= 920) return 4;
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
  const [mode, setMode] = useState<AccessibilityMode>("normal");
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, GroupKey>>({});
  const [activeGroup, setActiveGroup] = useState<GroupKey | "all">("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [groupEditor, setGroupEditor] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [newsVisible, setNewsVisible] = useState(true);
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

  const fontScale = useMemo(() => (mode === "elderly" ? 1.35 : 1), [mode]);
  const cardScale = useMemo(() => (mode === "elderly" ? 1.2 : 1), [mode]);
  const isDesktopLayout = width >= 1180;
  const navWidth = isDesktopLayout ? (navCollapsed ? 92 : 220) : 0;
  const rightWidth = isDesktopLayout && newsVisible ? 420 : 0;
  const mainPanelWidth = Math.max(width - navWidth - rightWidth - 80, 420);
  const gridColumns = resolveColumns(mainPanelWidth);
  const itemWidth = Math.floor((mainPanelWidth - gridColumns * 12) / gridColumns);
  const webDragEnabled = Platform.OS === "web" && typeof window !== "undefined" && !!window.electronAPI;

  const resolveGroup = (app: InstalledApp): GroupKey => groupOverrides[app.id] || detectGroup(app);

  useEffect(() => {
    (async () => {
      try {
        const [savedGroups, savedNav] = await Promise.all([
          AsyncStorage.getItem(APP_GROUP_STORAGE_KEY),
          AsyncStorage.getItem(NAV_COLLAPSE_STORAGE_KEY)
        ]);
        if (savedGroups) {
          setGroupOverrides(JSON.parse(savedGroups) as Record<string, GroupKey>);
        }
        if (savedNav) {
          setNavCollapsed(savedNav === "1");
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

    const keyword = query.trim().toLowerCase();
    const filtered = keyword
      ? all.filter(
          (app) =>
            app.name.toLowerCase().includes(keyword) || app.packageName.toLowerCase().includes(keyword)
        )
      : all;

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
  }, [apps, orderedIds, query, groupOverrides]);

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

  const onAppPress = async (app: InstalledApp) => {
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
      await launchApp(app);
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

  const toggleNavCollapsed = () => {
    setNavCollapsed((old) => {
      const next = !old;
      void AsyncStorage.setItem(NAV_COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <SafeAreaProvider>
      <View className="flex-1" style={{ backgroundColor: '#f8fafc' }}>
        <StatusBar barStyle="dark-content" />

        <View className="mx-auto w-full max-w-[1780px] p-4">
          {/* Modern Header with Gradient */}
          <View 
            className="rounded-3xl overflow-hidden shadow-glow"
            style={{ backgroundColor: '#0c9df0' }}
          >
            <View className="px-6 py-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View 
                    className="h-14 w-14 rounded-2xl items-center justify-center mr-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <Ionicons name="grid-outline" size={28} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 26 * fontScale }} className="font-bold text-white">
                      {"应用中心"}
                    </Text>
                    <Text style={{ fontSize: 13 * fontScale }} className="mt-1 text-white/70">
                      {"快速启动 · 智能分组 · 拖拽排序"}
                    </Text>
                  </View>
                </View>
                <View className="flex-row">
                  <Pressable
                    onPress={() => setNewsVisible((v) => !v)}
                    className={`h-12 w-12 items-center justify-center rounded-2xl mr-3 transition-all ${
                      newsVisible ? 'bg-white/25' : 'bg-white/10'
                    }`}
                    style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Ionicons name={newsVisible ? "newspaper" : "newspaper-outline"} size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>
            
            {/* Decorative line */}
            <View 
              className="h-1 w-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            />
          </View>

          {/* Control Panel */}
          <View className="mt-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-soft p-5">
            <View className="flex-row flex-wrap items-center justify-between">
              <ModeSwitcher
                mode={mode}
                onChange={(nextMode) => {
                  setMode(nextMode);
                  setPendingBlindAppId(null);
                }}
              />
              <View className="mt-2 w-full max-w-[440px] flex-row items-center rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 focus-within:border-brand-300 focus-within:bg-white focus-within:shadow-sm transition-all">
                <Ionicons name="search-outline" size={18} color="#94a3b8" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="\u641c\u7d22\u5e94\u7528..."
                  placeholderTextColor="#94a3b8"
                  className="ml-3 flex-1 text-slate-700 text-sm"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} className="p-1">
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </Pressable>
                )}
              </View>
            </View>
            {/* Progress Bar */}
            <View className="mt-4">
              <View className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <View
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                  style={{ width: `${Math.max(2, scanProgress.percent)}%` }}
                />
              </View>
            </View>
            
            {/* Status & Actions */}
            <View className="mt-3 flex-row flex-wrap items-center justify-between">
              <View className="flex-row items-center">
                {scanLoading ? (
                  <>
                    <View className="h-3.5 w-3.5 rounded-full border-2 border-brand-200 border-t-brand-500 mr-2" style={{ transform: [{ rotate: '45deg' }] }} />
                    <Text style={{ fontSize: 12 * fontScale }} className="text-slate-500">
                      {scanProgress.message}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                    <Text style={{ fontSize: 12 * fontScale }} className="ml-1.5 text-slate-500">
                      {scanFromCache ? "已使用缓存数据" : "扫描完成"}
                    </Text>
                  </>
                )}
              </View>
              
              <View className="flex-row">
                <Pressable 
                  onPress={resetOrder} 
                  className="mr-2 flex-row items-center rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 active:bg-slate-100"
                >
                  <Ionicons name="refresh-outline" size={14} color="#64748b" />
                  <Text style={{ fontSize: 12 * fontScale }} className="ml-1.5 text-slate-600 font-medium">
                    {"恢复排序"}
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setGroupEditor((v) => !v)}
                  className={`mr-2 flex-row items-center rounded-xl px-3 py-2 border ${
                    groupEditor 
                      ? "bg-brand-500 border-brand-500" 
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Ionicons 
                    name={groupEditor ? "folder-open" : "folder-outline"} 
                    size={14} 
                    color={groupEditor ? "#ffffff" : "#64748b"} 
                  />
                  <Text 
                    style={{ fontSize: 12 * fontScale }} 
                    className={`ml-1.5 font-medium ${groupEditor ? "text-white" : "text-slate-600"}`}
                  >
                    {"分组"}
                  </Text>
                </Pressable>
                
                <Pressable 
                  onPress={() => void loadInstalledApps(true)} 
                  className="flex-row items-center rounded-xl bg-brand-50 border border-brand-200 px-3 py-2 active:bg-brand-100"
                >
                  <Ionicons name="scan-outline" size={14} color="#0c9df0" />
                  <Text style={{ fontSize: 12 * fontScale }} className="ml-1.5 text-brand-600 font-medium">
                    {"重新扫描"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {groupEditor && selectedApp && (
            <View className="mt-4 rounded-2xl bg-white border border-slate-200 shadow-soft p-4">
              <View className="flex-row items-center mb-3">
                <View className="h-8 w-8 rounded-xl bg-brand-50 items-center justify-center mr-3">
                  <Ionicons name="folder-open-outline" size={16} color="#0c9df0" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-800">
                    {"编辑分组"}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {selectedApp.name}
                  </Text>
                </View>
                <Pressable 
                  onPress={() => setSelectedAppId(null)}
                  className="h-8 w-8 rounded-xl bg-slate-50 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </Pressable>
              </View>
              <View className="flex-row flex-wrap">
                {GROUP_KEYS.map((key) => {
                  const active = resolveGroup(selectedApp) === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setAppGroup(selectedApp.id, key)}
                      className={`mr-2 mt-2 rounded-xl px-4 py-2.5 border ${
                        active 
                          ? "bg-brand-500 border-brand-500 shadow-sm" 
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text className={`font-medium ${active ? "text-white" : "text-slate-600"}`}>
                        {GROUP_LABEL[key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View className={`mt-5 ${isDesktopLayout ? "flex-row" : ""}`}>
            {isDesktopLayout && (
              <View 
                className={`mr-5 rounded-3xl bg-white border border-slate-200 shadow-soft p-4 overflow-hidden transition-all duration-300 ${
                  navCollapsed ? "w-[88px]" : "w-[220px]"
                }`}
              >
                <View className="mb-4 flex-row items-center justify-between">
                  {!navCollapsed && (
                    <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {"分组"}
                    </Text>
                  )}
                  <Pressable 
                    onPress={toggleNavCollapsed}
                    className="h-7 w-7 rounded-lg bg-slate-50 items-center justify-center"
                  >
                    <Ionicons
                      name={navCollapsed ? "chevron-forward-outline" : "chevron-back-outline"}
                      size={14}
                      color="#64748b"
                    />
                  </Pressable>
                </View>
                {NAV_ITEMS.map((item) => {
                  const active = activeGroup === item.key;
                  const count = groupCounts[item.key as keyof typeof groupCounts];
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setActiveGroup(item.key)}
                      className={`mb-2 flex-row items-center rounded-xl px-3 py-2.5 transition-all duration-200 ${
                        active 
                          ? "bg-brand-500 shadow-sm" 
                          : "bg-transparent hover:bg-slate-50"
                      }`}
                    >
                      <Ionicons 
                        name={item.icon} 
                        size={18} 
                        color={active ? "#ffffff" : "#64748b"} 
                      />
                      {!navCollapsed && (
                        <>
                          <Text className={`ml-3 font-medium flex-1 ${active ? "text-white" : "text-slate-600"}`}>
                            {item.label}
                          </Text>
                          <View className={`min-w-[22px] px-1.5 py-0.5 rounded-full items-center ${
                            active ? "bg-white/20" : "bg-slate-100"
                          }`}>
                            <Text className={`text-xs font-semibold ${active ? "text-white" : "text-slate-500"}`}>
                              {count}
                            </Text>
                          </View>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View className={`${isDesktopLayout ? "mr-5 flex-1" : "w-full"}`}>
              <ScrollView style={{ maxHeight: isDesktopLayout ? 760 : undefined }}>
                {visibleGroups.map((group) => (
                  <View key={group} className="mb-6">
                    <View className="flex-row items-center mb-3">
                      <View className="h-6 w-1 rounded-full bg-brand-500 mr-3" />
                      <Text className="text-sm font-bold text-slate-700">{GROUP_LABEL[group]}</Text>
                      <View className="ml-3 px-2 py-0.5 rounded-full bg-slate-100">
                        <Text className="text-xs text-slate-500">{groupedApps[group].length}</Text>
                      </View>
                    </View>
                    <View className="flex-row flex-wrap">
                      {groupedApps[group].map((app) => (
                        <AppItem
                          key={app.id}
                          app={app}
                          fontScale={fontScale}
                          cardScale={cardScale}
                          itemWidth={itemWidth}
                          groupLabel={GROUP_LABEL[resolveGroup(app)]}
                          selected={selectedAppId === app.id}
                          dragEnabled={webDragEnabled}
                          dragHint={
                            webDragEnabled
                              ? dragOverId === app.id
                                ? "\u653e\u7f6e\u5230\u8fd9\u91cc"
                                : "\u62d6\u62fd\u6392\u5e8f"
                              : "\u6392\u5e8f"
                          }
                          webDragProps={
                            webDragEnabled
                              ? {
                                  draggable: true,
                                  onDragStart: () => setDraggingId(app.id),
                                  onDragOver: (e: any) => e.preventDefault(),
                                  onDragEnter: () => setDragOverId(app.id),
                                  onDragLeave: () => setDragOverId((old) => (old === app.id ? null : old)),
                                  onDrop: () => onDropReorder(app.id),
                                  onDragEnd: () => {
                                    setDraggingId(null);
                                    setDragOverId(null);
                                  }
                                }
                              : undefined
                          }
                          onPress={onAppPress}
                          onLongPress={(target) => setSelectedAppId(target.id)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {newsVisible && (
              <View className={`${isDesktopLayout ? "w-[400px]" : "w-full mt-4"}`}>
                <NewsPanel
                  current={newsCategory}
                  data={newsList}
                  loading={newsLoading}
                  error={newsError}
                  fontScale={fontScale}
                  onChangeCategory={setNewsCategory}
                  onRefresh={() => void loadNews(newsCategory)}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
