import Constants from "expo-constants";
import { Platform } from "react-native";

export const RAMESH_MERCHANT_ID = "11111111-1111-4111-8111-111111111111";
export const RAMESH_DEVICE_ID = "SBX-RAMESH-001";
export const SUGAR_SKU = "Sugar";
export const SEEDED_NEIGHBOURS = 120;

function lanHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }
  const host = hostUri.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }
  return host;
}

function defaultBase(): string {
  const override = process.env.EXPO_PUBLIC_API_BASE;
  if (override) {
    return override.replace(/\/$/, "");
  }
  const host = lanHost();
  if (host) {
    return `http://${host}:8000`;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://localhost:8000";
}

export const API_BASE = defaultBase();
