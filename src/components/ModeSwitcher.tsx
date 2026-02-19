import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { AccessibilityMode } from "../types";

type Props = {
  mode: AccessibilityMode;
  onChange: (mode: AccessibilityMode) => void;
  theme?: "light" | "dark";
};

const options: { key: AccessibilityMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "normal", label: "\u6b63\u5e38", icon: "desktop-outline" },
  { key: "elderly", label: "\u8001\u5e74", icon: "accessibility-outline" },
  { key: "blind", label: "\u65e0\u969c", icon: "ear-outline" },
  { key: "colorWeak", label: "\u8272\u5f31", icon: "eye-outline" }
];

export function ModeSwitcher({ mode, onChange, theme = "light" }: Props) {
  const isDark = theme === "dark";
  return (
    <View className={`flex-row rounded-xl p-1 border ${isDark ? "bg-white/10 border-white/25" : "bg-slate-100/80 border-slate-200"}`}>
      {options.map((item) => {
        const active = item.key === mode;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className={`flex-row items-center rounded-lg ${isDark ? "px-2.5" : "px-3"} py-1.5 transition-all duration-300 ${active
                ? `${isDark ? "bg-white/95" : "bg-white shadow-sm"} scale-100`
                : `${isDark ? "bg-transparent scale-95 opacity-85" : "bg-transparent scale-95 opacity-70 hover:opacity-100"}`
              }`}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={active ? "#0c9df0" : isDark ? "#ffffff" : "#64748b"}
            />
            <Text className={`text-xs font-bold ml-1.5 ${active ? "text-slate-800" : isDark ? "text-white" : "text-slate-500"}`}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
