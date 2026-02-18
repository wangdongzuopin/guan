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
  webDragProps?: Record<string, any>;
  onPress: (app: InstalledApp) => void;
  onLongPress?: (app: InstalledApp) => void;
};

function pickIcon(app: InstalledApp): keyof typeof Ionicons.glyphMap {
  const value = `${app.packageName} ${app.name}`.toLowerCase();
  if (value.includes("edge") || value.includes("browser") || value.includes("chrome")) return "globe-outline";
  if (value.includes("code") || value.includes("studio")) return "code-slash-outline";
  if (value.includes("map")) return "map-outline";
  if (value.includes("qq") || value.includes("chat") || value.includes("wechat")) return "chatbubbles-outline";
  if (value.includes("music")) return "musical-notes-outline";
  if (value.includes("setting")) return "settings-outline";
  if (value.includes("terminal") || value.includes("cmd")) return "terminal-outline";
  if (value.includes("folder") || value.includes("file")) return "folder-outline";
  if (value.includes("calculator")) return "calculator-outline";
  if (value.includes("calendar")) return "calendar-outline";
  if (value.includes("mail") || value.includes("email")) return "mail-outline";
  return "apps-outline";
}

export function AppItem({
  app,
  fontScale,
  cardScale,
  itemWidth,
  groupLabel,
  selected,
  dragEnabled,
  dragHint,
  webDragProps,
  onPress,
  onLongPress
}: Props) {
  return (
    <View
      style={{
        width: itemWidth,
        paddingRight: 12,
        marginBottom: 12
      }}
    >
      <Pressable
        onPress={() => onPress(app)}
        onLongPress={() => onLongPress?.(app)}
        className={`rounded-2xl overflow-hidden transition-all duration-200 ${
          selected 
            ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-glow" 
            : "bg-white/80 backdrop-blur-sm border border-white/50 shadow-soft hover-lift"
        }`}
        {...(webDragProps as any)}
        style={{
          paddingVertical: 16 * cardScale,
          minHeight: 140
        }}
      >
        <View className="items-center">
          <View 
            className={`h-14 w-14 items-center justify-center rounded-2xl ${
              selected ? "bg-white/20" : "bg-gradient-to-br from-brand-50 to-brand-100"
            }`}
          >
            <Ionicons 
              name={pickIcon(app)} 
              size={26} 
              color={selected ? "#ffffff" : "#0c9df0"} 
            />
          </View>

          <Text
            style={{ fontSize: 14 * fontScale }}
            className={`mt-3 text-center font-semibold ${selected ? "text-white" : "text-slate-800"}`}
            numberOfLines={2}
          >
            {app.name}
          </Text>

          {!!groupLabel && (
            <View 
              className={`mt-2 rounded-full px-2.5 py-1 ${
                selected ? "bg-white/20" : "bg-brand-50 border border-brand-100"
              }`}
            >
              <Text 
                style={{ fontSize: 10 * fontScale }} 
                className={`font-medium ${selected ? "text-white" : "text-brand-600"}`}
              >
                {groupLabel}
              </Text>
            </View>
          )}

          <Text 
            style={{ fontSize: 11 * fontScale }} 
            className={`mt-3 font-medium ${selected ? "text-white/80" : "text-brand-500"}`}
          >
            {"点击打开"}
          </Text>

          {dragEnabled && (
            <View className="mt-2 flex-row items-center">
              <Ionicons 
                name="reorder-three-outline" 
                size={14} 
                color={selected ? "rgba(255,255,255,0.6)" : "#94a3b8"} 
              />
              <Text 
                style={{ fontSize: 10 * fontScale }} 
                className={`ml-1 ${selected ? "text-white/60" : "text-slate-400"}`}
              >
                {dragHint || "拖拽排序"}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
