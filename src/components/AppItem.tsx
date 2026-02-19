import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { InstalledApp } from "../types";

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
  webDragProps?: Record<string, any>;
  onTogglePinned?: (app: InstalledApp) => void;
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
  webDragProps,
  onTogglePinned,
  onPress,
  onLongPress
}: Props) {
  const packageHint = app.packageName?.replace(/^desktop:/, "") || app.packageName;
  const hasPinToggle = typeof onTogglePinned === "function";

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

          <View className="mt-4 flex-row items-center justify-between">
            <View className={`rounded-xl px-2.5 py-1 ${selected ? "bg-white/20" : "bg-slate-100"}`}>
              <Text style={{ fontSize: 10 * fontScale }} className={`${selected ? "text-white/90" : "text-slate-500"} font-semibold`}>
                点击打开
              </Text>
            </View>

            {dragEnabled ? (
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

