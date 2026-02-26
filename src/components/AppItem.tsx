import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { AppRuntimeStat, InstalledApp } from "../types";

type Props = {
  app: InstalledApp;
  fontScale: number;
  cardScale: number;
  itemWidth: number;
  groupLabel?: string;
  selected?: boolean;
  dragEnabled?: boolean;
  dragHint?: string;
  pinned?: boolean;
  runtime?: AppRuntimeStat;
  canForceStop?: boolean;
  stopping?: boolean;
  webDragProps?: Record<string, any>;
  onTogglePinned?: (app: InstalledApp) => void;
  onForceStop?: (app: InstalledApp) => void;
  onPress: (app: InstalledApp) => void;
  onLongPress?: (app: InstalledApp) => void;
};

export function AppItem({
  app,
  fontScale,
  cardScale,
  itemWidth,
  groupLabel,
  selected,
  dragEnabled,
  dragHint,
  pinned,
  runtime,
  canForceStop,
  stopping,
  webDragProps,
  onTogglePinned,
  onForceStop,
  onPress,
  onLongPress
}: Props) {
  const packageHint = app.packageName?.replace(/^desktop:/, "") || app.packageName;
  const hasPinToggle = typeof onTogglePinned === "function";
  const status = runtime?.status || "stopped";
  const statusLabel = status === "starting" ? "启动" : status === "running" ? "运行中" : "停止";
  const statusStyle =
    status === "starting"
      ? "bg-amber-100"
      : status === "running"
        ? "bg-emerald-100"
        : "bg-slate-100";
  const statusTextStyle =
    status === "starting" ? "text-amber-700" : status === "running" ? "text-emerald-700" : "text-slate-500";
  const cpuText = status === "stopped" ? "--" : `${(runtime?.cpuUsage || 0).toFixed(1)}%`;
  const memoryText = status === "stopped" ? "--" : `${(runtime?.memoryUsageMB || 0).toFixed(1)} MB`;
  const showStopAction = canForceStop && onForceStop && status === "running";
  const canStart = status === "stopped";

  return (
    <View
      style={{
        width: itemWidth,
        marginBottom: 16
      }}
    >
      <Pressable
        onPress={() => onPress(app)}
        onLongPress={() => onLongPress?.(app)}
        className={`rounded-3xl overflow-hidden transition-all-smooth relative group border ${selected
            ? "bg-gradient-to-br from-brand-600 to-brand-500 border-brand-500 shadow-glow cursor-default transform scale-[1.02] z-10"
            : "bg-white border-slate-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-1 cursor-pointer"
          }`}
        {...(webDragProps as any)}
        style={{
          paddingVertical: 14 * cardScale,
          minHeight: 148
        }}
      >
        <View className={`absolute left-0 top-0 h-full w-1.5 ${selected ? "bg-white/60" : "bg-brand-400/80"}`} />
        {selected && (
          <View className="absolute top-3 right-3 z-10 bg-white/20 rounded-full p-1">
            <Ionicons name="checkmark" size={14} color="white" />
          </View>
        )}
        <Pressable
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onTogglePinned?.(app);
          }}
          className={`absolute top-3 left-3 z-10 h-7 w-7 items-center justify-center rounded-full ${selected ? "bg-white/20" : "bg-slate-100"}`}
        >
          <Ionicons name={pinned ? "star" : "star-outline"} size={13} color={pinned ? "#f59e0b" : "#94a3b8"} />
        </Pressable>

        <View className={`px-4 ${hasPinToggle ? "pl-12" : ""}`}>
          <View className="flex-row items-center justify-between">
            {!!groupLabel && (
              <View
                className={`rounded-full px-2.5 py-1 ${selected
                    ? "bg-white/20"
                    : "bg-brand-50 border border-brand-100"
                  }`}
              >
                <Text
                  style={{ fontSize: 10 * fontScale, letterSpacing: 0.2 }}
                  className={`font-semibold ${selected ? "text-white/95" : "text-brand-600"}`}
                >
                  {groupLabel}
                </Text>
              </View>
            )}
            {!groupLabel && <View />}
            <Text
              style={{ fontSize: 10 * fontScale }}
              className={`${selected ? "text-white/70" : "text-slate-300"}`}
            >
              {pinned ? "已置顶" : `#${app.id.slice(-4)}`}
            </Text>
          </View>

          <Text
            style={{ fontSize: 16 * fontScale, letterSpacing: 0.1 }}
            className={`mt-3 font-bold leading-6 ${selected ? "text-white" : "text-slate-800 group-hover:text-slate-900"
              }`}
            numberOfLines={2}
          >
            {app.name}
          </Text>

          <Text
            style={{ fontSize: 11 * fontScale, letterSpacing: 0.1 }}
            numberOfLines={1}
            className={`mt-1 ${selected ? "text-white/70" : "text-slate-400"}`}
          >
            {packageHint}
          </Text>

          <View className="mt-3 flex-row items-center">
            <View className={`rounded-full px-2.5 py-1 ${selected ? "bg-white/20" : statusStyle}`}>
              <Text style={{ fontSize: 10 * fontScale }} className={`${selected ? "text-white/90" : statusTextStyle} font-semibold`}>
                {statusLabel}
              </Text>
            </View>
            {runtime?.recommendedToClose && (
              <View className={`ml-2 rounded-full px-2.5 py-1 ${selected ? "bg-white/20" : "bg-rose-100"}`}>
                <Text style={{ fontSize: 10 * fontScale }} className={`${selected ? "text-white/90" : "text-rose-600"} font-semibold`}>
                  建议关闭
                </Text>
              </View>
            )}
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text style={{ fontSize: 10 * fontScale }} className={`${selected ? "text-white/85" : "text-slate-500"} font-semibold`}>
              CPU {cpuText} · MEM {memoryText}
            </Text>

            {showStopAction ? (
              <Pressable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onForceStop(app);
                }}
                className={`rounded-lg px-2.5 py-1 ${selected ? "bg-white/20" : "bg-rose-500"}`}
              >
                <Text style={{ fontSize: 10 * fontScale }} className="font-semibold text-white">
                  {stopping ? "停止中" : "强行停止"}
                </Text>
              </Pressable>
            ) : canStart ? (
              <Pressable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  onPress(app);
                }}
                className={`rounded-lg px-2.5 py-1 ${selected ? "bg-white/20" : "bg-brand-500"}`}
              >
                <Text style={{ fontSize: 10 * fontScale }} className="font-semibold text-white">
                  启动
                </Text>
              </Pressable>
            ) : status === "starting" ? (
              <View className={`rounded-lg px-2.5 py-1 ${selected ? "bg-white/20" : "bg-amber-500"}`}>
                <Text style={{ fontSize: 10 * fontScale }} className="font-semibold text-white">
                  启动中
                </Text>
              </View>
            ) : dragEnabled ? (
              <View className="flex-row items-center">
                <Ionicons name="reorder-three-outline" size={14} color={selected ? "rgba(255,255,255,0.8)" : "#94a3b8"} />
                <Text
                  style={{ fontSize: 10 * fontScale }}
                  className={`ml-1 ${selected ? "text-white/80" : "text-slate-400"}`}
                >
                  {dragHint || "拖拽排序"}
                </Text>
              </View>
            ) : (
              <View />
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

