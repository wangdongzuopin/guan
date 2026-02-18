import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { NewsCategory, NewsItem } from "../types";

type Props = {
  current: NewsCategory;
  data: NewsItem[];
  loading: boolean;
  error: string | null;
  fontScale: number;
  onChangeCategory: (category: NewsCategory) => void;
  onRefresh: () => void;
};

const categories: { key: NewsCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "national", label: "热点", icon: "flame-outline" },
  { key: "technology", label: "科技", icon: "hardware-chip-outline" },
  { key: "lifestyle", label: "生活", icon: "heart-outline" }
];

export function NewsPanel({
  current,
  data,
  loading,
  error,
  fontScale,
  onChangeCategory,
  onRefresh
}: Props) {
  return (
    <View className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-soft overflow-hidden">
      {/* Header */}
      <View className="p-5 bg-gradient-to-br from-brand-500 to-brand-600">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center mr-3">
              <Ionicons name="newspaper-outline" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={{ fontSize: 18 * fontScale }} className="font-bold text-white">
                {"热点资讯"}
              </Text>
              <Text style={{ fontSize: 11 * fontScale }} className="text-white/70 mt-0.5">
                {"实时更新"}
              </Text>
            </View>
          </View>
          <Pressable 
            onPress={onRefresh} 
            className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center active:scale-95 transition-transform"
          >
            <Ionicons name="refresh-outline" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* Category Tabs */}
      <View className="px-4 pt-4">
        <View className="flex-row bg-brand-50 rounded-2xl p-1">
          {categories.map((category) => {
            const active = current === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => onChangeCategory(category.key)}
                className={`flex-1 flex-row items-center justify-center rounded-xl py-2.5 transition-all duration-200 ${
                  active 
                    ? "bg-white shadow-sm" 
                    : "bg-transparent"
                }`}
              >
                <Ionicons 
                  name={category.icon} 
                  size={14} 
                  color={active ? "#0c9df0" : "#64748b"} 
                />
                <Text
                  style={{ fontSize: 12 * fontScale }}
                  className={`ml-1.5 font-medium ${active ? "text-brand-600" : "text-slate-500"}`}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Status */}
      <View className="px-4 py-3">
        {loading && (
          <View className="flex-row items-center">
            <View className="h-4 w-4 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin mr-2" />
            <Text style={{ fontSize: 12 * fontScale }} className="text-slate-500">
              {"加载中..."}
            </Text>
          </View>
        )}
        {error && (
          <View className="flex-row items-center bg-rose-50 rounded-xl px-3 py-2">
            <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
            <Text style={{ fontSize: 12 * fontScale }} className="ml-2 text-rose-600 flex-1">
              {error}
            </Text>
          </View>
        )}
      </View>

      {/* News List */}
      <ScrollView className="max-h-[600px] px-4 pb-4">
        {data.map((news, index) => (
          <Pressable 
            key={news.id} 
            className={`mb-3 rounded-2xl bg-surface-50 border border-surface-200 p-4 active:scale-[0.98] transition-transform hover:bg-white hover:shadow-soft ${
              index === 0 ? "bg-gradient-to-br from-brand-50/50 to-white border-brand-100" : ""
            }`}
          >
            <View className="flex-row items-start">
              <View className={`h-2 w-2 rounded-full mt-2 mr-3 ${index < 3 ? "bg-brand-500" : "bg-slate-300"}`} />
              <View className="flex-1">
                <Text style={{ fontSize: 14 * fontScale }} className="font-semibold text-slate-800 leading-5">
                  {news.title}
                </Text>
                <View className="flex-row items-center mt-2">
                  <Text style={{ fontSize: 11 * fontScale }} className="text-brand-600 font-medium">
                    {news.source}
                  </Text>
                  <Text style={{ fontSize: 11 * fontScale }} className="text-slate-400 mx-2">
                    {"·"}
                  </Text>
                  <Text style={{ fontSize: 11 * fontScale }} className="text-slate-400">
                    {news.publishedAt}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
