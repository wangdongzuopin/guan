import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { NewsCategory, NewsItem } from "../types";

type Props = {
  current: NewsCategory;
  data: NewsItem[];
  loading: boolean;
  error: string | null;
  fontScale: number;
  isMobile?: boolean;
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
  isMobile = false,
  onChangeCategory,
  onRefresh,
  onOpenDetail
}: Props) {
  return (
    <View className={`${isMobile ? "rounded-none" : "rounded-2xl"} h-full overflow-hidden border border-slate-200 bg-slate-50`}>
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5">
        <View className="flex-row items-center">
          <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Ionicons name="newspaper-outline" size={16} color="#2563eb" />
          </View>
          <View>
            <Text style={{ fontSize: 16 * fontScale }} className="font-semibold text-slate-900">
              热点资讯
            </Text>
            <Text style={{ fontSize: 11 * fontScale }} className="text-slate-500">
              简洁快读
            </Text>
          </View>
        </View>

        <Pressable onPress={onRefresh} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <Ionicons name="refresh-outline" size={18} color="#475569" />
        </Pressable>
      </View>

      <View className="border-b border-slate-200 bg-white px-4 py-2.5">
        <View className="flex-row rounded-xl bg-slate-100 p-1">
          {categories.map((category) => {
            const active = current === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => onChangeCategory(category.key)}
                className={`flex-1 flex-row items-center justify-center rounded-lg py-2.5 ${active ? "bg-white" : "bg-transparent"}`}
              >
                <Ionicons
                  name={active ? (category.icon.replace("-outline", "") as any) : category.icon}
                  size={14}
                  color={active ? "#2563eb" : "#64748b"}
                />
                <Text style={{ fontSize: 12 * fontScale }} className={`ml-1.5 font-medium ${active ? "text-slate-900" : "text-slate-500"}`}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-1">
        {loading && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white/70">
            <View className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
            <Text className="mt-2 text-xs font-medium text-slate-500">加载中...</Text>
          </View>
        )}

        {error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="cloud-offline-outline" size={30} color="#ef4444" />
            <Text className="mt-2 text-center text-sm text-slate-500">{error}</Text>
            <Pressable onPress={onRefresh} className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2">
              <Text className="text-xs font-medium text-slate-600">重试</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView className="flex-1 px-3" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
            {data.map((news, index) => (
              <Pressable
                key={news.id}
                onPress={() => onOpenDetail(news)}
                className="mb-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
              >
                <View className="flex-row items-start">
                  <View className={`mr-2 mt-0.5 rounded px-1.5 py-0.5 ${index < 3 ? "bg-blue-50" : "bg-slate-100"}`}>
                    <Text className={`text-[10px] font-semibold ${index < 3 ? "text-blue-600" : "text-slate-500"}`}>{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontSize: 13.5 * fontScale }} className="font-medium leading-5 text-slate-900" numberOfLines={2}>
                      {news.title}
                    </Text>
                    <View className="mt-2 flex-row items-center">
                      <Text style={{ fontSize: 11 * fontScale }} className="text-slate-500">
                        {news.source}
                      </Text>
                      <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
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
