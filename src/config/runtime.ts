import Constants from "expo-constants";

type ExtraConfig = {
  newsApiKey?: string;
  newsApiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra || {}) as ExtraConfig;

export const runtimeConfig = {
  newsApiKey: extra.newsApiKey || "",
  newsApiBaseUrl: extra.newsApiBaseUrl || "https://gnews.io/api/v4/top-headlines"
};
