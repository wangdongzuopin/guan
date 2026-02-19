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
  onOpenDetail: (item: NewsItem) => void;
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
  onRefresh,
  onOpenDetail
}: Props) {
  return (
    <View className="rounded-[1.75rem] glass-panel h-full flex-col overflow-hidden border border-white/60 shadow-lg shadow-indigo-500/5">
      <View className="px-6 py-5 border-b border-slate-100/50 flex-row items-center justify-between bg-white/40">
        <View className="flex-row items-center">
          <View className="h-10 w-10 rounded-xl bg-brand-100 items-center justify-center mr-3 text-brand-600">
            <Ionicons name="newspaper" size={20} color="#58abed" />
          </View>
          <View>
            <Text style={{ fontSize: 18 * fontScale }} className="font-bold text-slate-800 tracking-tight">
              {"热点资讯"}
            </Text>
            <Text style={{ fontSize: 12 * fontScale }} className="text-slate-500 font-medium">
              {"每日更新 · 实时播报"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onRefresh}
          className="h-9 w-9 rounded-full bg-slate-50 items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <Ionicons name="refresh-outline" size={18} color="#64748b" />
        </Pressable>
      </View>

      <View className="px-5 py-3 bg-white/20">
        <View className="flex-row bg-slate-100/80 rounded-xl p-1">
          {categories.map((category) => {
            const active = current === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => onChangeCategory(category.key)}
                className={`flex-1 flex-row items-center justify-center rounded-lg py-2 transition-all duration-300 ${
                  active ? "bg-white shadow-sm scale-100" : "bg-transparent scale-95 opacity-70 hover:opacity-100"
                }`}
              >
                <Ionicons
                  name={active ? (category.icon.replace("-outline", "") as any) : category.icon}
                  size={14}
                  color={active ? "#58abed" : "#64748b"}
                />
                <Text
                  style={{ fontSize: 12 * fontScale }}
                  className={`ml-1.5 font-bold ${active ? "text-slate-800" : "text-slate-500"}`}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-1 relative bg-white/30">
        {loading && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white/50 backdrop-blur-sm">
            <View className="h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
            <Text className="mt-2 text-xs font-semibold text-brand-600">加载中...</Text>
          </View>
        )}

        {error ? (
          <View className="flex-1 items-center justify-center p-6 text-center">
            <Ionicons name="cloud-offline-outline" size={32} color="#f43f5e" />
            <Text className="mt-2 text-sm text-slate-500 font-medium text-center">{error}</Text>
            <Pressable onPress={onRefresh} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg">
              <Text className="text-xs font-bold text-slate-600">重试</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
            {data.map((news, index) => (
              <Pressable
                key={news.id}
                onPress={() => onOpenDetail(news)}
                className={`group mb-3 rounded-2xl p-4 transition-all duration-300 border border-transparent ${
                  index === 0
                    ? "bg-gradient-to-br from-brand-50 to-white border-brand-100/50 hover:shadow-md"
                    : "bg-white/60 hover:bg-white hover:shadow-sm hover:border-slate-100"
                }`}
              >
                <View className="flex-row items-start">
                  <Text
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mr-2 mt-0.5 ${
                      index < 3 ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </Text>
                  <View className="flex-1">
                    <Text
                      style={{ fontSize: 13.5 * fontScale }}
                      className={`font-bold leading-[1.4] ${
                        index < 3 ? "text-slate-900" : "text-slate-700"
                      } group-hover:text-brand-700 transition-colors`}
                      numberOfLines={2}
                    >
                      {news.title}
                    </Text>
                    <View className="flex-row items-center mt-2.5">
                      <Text style={{ fontSize: 11 * fontScale }} className="text-slate-400 font-medium">
                        {news.source}
                      </Text>
                      <View className="h-1 w-1 rounded-full bg-slate-300 mx-2" />
                      <Text style={{ fontSize: 11 * fontScale }} className="text-slate-400">
                        {news.publishedAt}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

