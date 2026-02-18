import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { AccessibilityMode } from "../types";

type Props = {
  mode: AccessibilityMode;
  onChange: (mode: AccessibilityMode) => void;
};

const options: { key: AccessibilityMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "normal", label: "\u6b63\u5e38", icon: "desktop-outline" },
  { key: "elderly", label: "\u8001\u5e74", icon: "accessibility-outline" },
  { key: "blind", label: "\u65e0\u969c\u788d", icon: "ear-outline" }
];

export function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <View className="flex-row rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
      {options.map((item) => {
        const active = item.key === mode;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className={`flex-row items-center rounded-xl px-3 py-2 ${
              active ? "bg-white shadow-sm" : "bg-transparent"
            }`}
          >
            <Ionicons 
              name={item.icon} 
              size={14} 
              color={active ? "#0c9df0" : "#64748b"} 
            />
            <Text className={`text-xs font-semibold ml-1.5 ${active ? "text-brand-600" : "text-slate-500"}`}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
