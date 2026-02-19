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
  accentColor?: string;
  surfaceColor?: string;
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
  accentColor = "#2563eb",
  surfaceColor = "#ffffff",
  onTogglePinned,
  onPress,
  onLongPress
}: Props) {
  const packageHint = app.packageName?.replace(/^desktop:/, "") || app.packageName;
  const hasPinToggle = typeof onTogglePinned === "function";
  const isCompact = itemWidth < 190;

  return (
    <View style={{ width: itemWidth, marginBottom: 12 }}>
      <Pressable
        onPress={() => onPress(app)}
        onLongPress={() => onLongPress?.(app)}
        className={`relative overflow-hidden rounded-2xl border bg-white ${selected ? "shadow-sm" : ""}`}
        {...(webDragProps as any)}
        style={{
          minHeight: isCompact ? 116 : 130,
          paddingVertical: (isCompact ? 10 : 12) * cardScale,
          backgroundColor: surfaceColor,
          borderColor: selected ? accentColor : "#e2e8f0",
          borderWidth: selected ? 1.5 : 1
        }}
      >
        {hasPinToggle && (
          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onTogglePinned?.(app);
            }}
            className="absolute right-2 top-2 z-10 items-center justify-center rounded-full bg-slate-50"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Ionicons name={pinned ? "star" : "star-outline"} size={15} color={pinned ? "#eab308" : accentColor} />
          </Pressable>
        )}

        <View className={`px-3.5 ${hasPinToggle ? "pr-12" : ""}`}>
          <View className="mb-2.5 flex-row items-center justify-between">
            <View className="rounded-full bg-slate-100 px-2 py-0.5">
              <Text style={{ fontSize: 10 * fontScale }} className="font-medium text-slate-500">
                {groupLabel || "应用"}
              </Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={16} color={accentColor} />}
          </View>

          <Text style={{ fontSize: (isCompact ? 14 : 15) * fontScale }} className="font-semibold text-slate-900" numberOfLines={2}>
            {app.name}
          </Text>

          {!isCompact && (
            <Text style={{ fontSize: 11 * fontScale }} numberOfLines={1} className="mt-1 text-slate-400">
              {packageHint}
            </Text>
          )}

          <View className="mt-3 flex-row items-center justify-between">
            <Text style={{ fontSize: 11 * fontScale, color: accentColor }} className="font-medium">
              打开
            </Text>
            {dragEnabled && !isCompact && (
              <View className="flex-row items-center">
                <Ionicons name="reorder-three-outline" size={14} color="#94a3b8" />
                <Text style={{ fontSize: 10 * fontScale }} className="ml-1 text-slate-400">
                  {dragHint || "拖拽排序"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
