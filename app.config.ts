import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AppCollection",
  slug: "app-collection-rn",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "appcollection",
  userInterfaceStyle: "light",
  runtimeVersion: {
    policy: "sdkVersion"
  },
  ios: {
    bundleIdentifier: "com.demo.appcollection",
    supportsTablet: true,
    infoPlist: {
      LSApplicationQueriesSchemes: ["weixin", "mqq", "androidamap"]
    }
  },
  android: {
    package: "com.demo.appcollection",
    permissions: ["QUERY_ALL_PACKAGES"],
    intentFilters: [
      {
        action: "VIEW",
        data: [
          { scheme: "weixin" },
          { scheme: "mqq" },
          { scheme: "androidamap" }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  extra: {
    eas: {
      projectId: "replace-with-your-eas-project-id"
    },
    newsApiKey: process.env.EXPO_PUBLIC_NEWS_API_KEY || "",
    newsApiBaseUrl:
      process.env.EXPO_PUBLIC_NEWS_API_BASE_URL || "https://gnews.io/api/v4/top-headlines"
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24
        },
        ios: {
          deploymentTarget: "15.1"
        }
      }
    ]
  ]
};

export default config;
