import { mockNews } from "../constants/mockNews";
import { runtimeConfig } from "../config/runtime";
import { NewsCategory, NewsItem } from "../types";

const topicMap: Record<NewsCategory, string> = {
  national: "nation",
  technology: "technology",
  lifestyle: "health"
};

type GNewsArticle = {
  title?: string;
  source?: { name?: string };
  publishedAt?: string;
  url?: string;
};

function toLocalDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

async function fetchFromGNews(category: NewsCategory): Promise<NewsItem[]> {
  if (!runtimeConfig.newsApiKey) {
    return [];
  }

  const query = new URLSearchParams({
    token: runtimeConfig.newsApiKey,
    topic: topicMap[category],
    lang: "zh",
    country: "cn",
    max: "20"
  });

  const response = await fetch(`${runtimeConfig.newsApiBaseUrl}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`news api failed with ${response.status}`);
  }

  const body = await response.json();
  const articles: GNewsArticle[] = Array.isArray(body?.articles) ? body.articles : [];

  return articles
    .filter((item) => item?.title)
    .map((item, index) => ({
      id: `${category}-${index}-${item.publishedAt || ""}`,
      title: item.title || "",
      source: item.source?.name || "GNews",
      publishedAt: toLocalDateTime(item.publishedAt),
      category,
      url: item.url
    }));
}

export async function getHotNews(category: NewsCategory): Promise<NewsItem[]> {
  try {
    const online = await fetchFromGNews(category);
    if (online.length > 0) {
      return online;
    }
  } catch {
    // Ignore and fall back to bundled data.
  }

  return mockNews.filter((item) => item.category === category);
}
