import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export const AUTH_KEYS = {
  isLoggedIn: "@ConvoInsight_isLoggedIn",
  userName: "@ConvoInsight_userName",
  userPhone: "@ConvoInsight_userPhone",
  whatsAppName: "@ConvoInsight_whatsAppName",
} as const;

export interface StoredUser {
  phone: string;
  displayName: string;
}

export function normalizePhone(countryCode: string, digits: string): string {
  const code = countryCode.replace(/\s/g, "");
  const num = digits.replace(/\D/g, "");
  return `${code}${num}`;
}

export function isValidPhoneDigits(digits: string): boolean {
  return digits.replace(/\D/g, "").length >= 10;
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const [phone, displayName] = await Promise.all([
    AsyncStorage.getItem(AUTH_KEYS.userPhone),
    AsyncStorage.getItem(AUTH_KEYS.userName),
  ]);
  if (!phone) return null;
  return {
    phone,
    displayName: displayName || "ConvoInsight User",
  };
}

export async function isLoggedIn(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(AUTH_KEYS.isLoggedIn);
  const phone = await AsyncStorage.getItem(AUTH_KEYS.userPhone);
  return flag === "true" && !!phone;
}

export async function saveSession(
  phone: string,
  displayName?: string
): Promise<StoredUser> {
  const name = (displayName || "ConvoInsight User").trim();
  await AsyncStorage.multiSet([
    [AUTH_KEYS.isLoggedIn, "true"],
    [AUTH_KEYS.userPhone, phone],
    [AUTH_KEYS.userName, name],
    [AUTH_KEYS.whatsAppName, name],
  ]);
  return { phone, displayName: name };
}

export async function logout(): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEYS.isLoggedIn, "false");
}

/** Optional backend sync — fails silently if API is offline. */
export async function syncUserWithBackend(
  phone: string,
  displayName: string
): Promise<void> {
  try {
    const baseUrl = getApiUrl();
    await fetch(new URL("/api/auth/login", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, displayName }),
    });
  } catch {
    /* offline-first */
  }
}

export async function loginWithPhone(
  countryCode: string,
  phoneDigits: string,
  displayName?: string
): Promise<StoredUser> {
  const phone = normalizePhone(countryCode, phoneDigits);
  const user = await saveSession(phone, displayName);
  await syncUserWithBackend(phone, user.displayName);
  return user;
}
