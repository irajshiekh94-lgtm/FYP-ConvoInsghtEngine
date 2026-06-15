import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export const AUTH_KEYS = {
  isLoggedIn: "@ConvoInsight_isLoggedIn",
  userName: "@ConvoInsight_userName",
  userEmail: "@ConvoInsight_userEmail",
  whatsAppName: "@ConvoInsight_whatsAppName",
} as const;

export type AuthPurpose = "login" | "signup";

export interface StoredUser {
  email: string;
  displayName: string;
}

export class AuthApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const [email, displayName] = await Promise.all([
    AsyncStorage.getItem(AUTH_KEYS.userEmail),
    AsyncStorage.getItem(AUTH_KEYS.userName),
  ]);
  if (!email) return null;
  return {
    email,
    displayName: displayName || "ConvoInsight User",
  };
}

export async function isLoggedIn(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(AUTH_KEYS.isLoggedIn);
  const email = await AsyncStorage.getItem(AUTH_KEYS.userEmail);
  return flag === "true" && !!email;
}

export async function saveSession(
  email: string,
  displayName?: string
): Promise<StoredUser> {
  const normalized = normalizeEmail(email);
  const name = (displayName || "ConvoInsight User").trim();
  await AsyncStorage.multiSet([
    [AUTH_KEYS.isLoggedIn, "true"],
    [AUTH_KEYS.userEmail, normalized],
    [AUTH_KEYS.userName, name],
    [AUTH_KEYS.whatsAppName, name],
  ]);
  return { email: normalized, displayName: name };
}

export async function logout(): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEYS.isLoggedIn, "false");
}

async function parseApiError(res: Response): Promise<AuthApiError> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") {
      return new AuthApiError(data.detail, data.error);
    }
    if (typeof data?.detail === "object" && data.detail !== null) {
      const detail = data.detail as { error?: string; detail?: string };
      if (typeof detail.detail === "string") {
        return new AuthApiError(detail.detail, detail.error);
      }
    }
    if (Array.isArray(data?.detail)) {
      const message = data.detail
        .map((d: { msg?: string }) => d.msg)
        .filter(Boolean)
        .join(", ");
      return new AuthApiError(message || `Request failed (${res.status})`);
    }
    if (typeof data?.message === "string") {
      return new AuthApiError(data.message);
    }
  } catch {
    /* ignore */
  }
  return new AuthApiError(`Request failed (${res.status})`);
}

export interface SendOtpResult {
  message: string;
  devOtp?: string;
}

export async function sendOtp(
  email: string,
  purpose: AuthPurpose
): Promise<SendOtpResult> {
  const normalized = normalizeEmail(email);
  const baseUrl = getApiUrl();
  const url = new URL("/api/auth/send-otp", baseUrl).href;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, purpose }),
    });
  } catch {
    throw new AuthApiError(
      `Cannot reach the server at ${baseUrl}. Start the backend with --host 0.0.0.0 --port 8000 (same Wi‑Fi as phone; URL is auto-detected in dev).`
    );
  }

  if (res.status === 404 && purpose === "login") {
    throw await parseApiError(res);
  }

  if (res.status === 404) {
    throw new AuthApiError(
      "Auth API not found. Restart the backend server so /api/auth routes load.",
      "auth_api_not_found"
    );
  }

  if (!res.ok) {
    throw await parseApiError(res);
  }

  const data = await res.json();
  return {
    message: data.message ?? "Code sent",
    devOtp: data.devOtp,
  };
}

export async function verifyOtpAndLogin(
  email: string,
  otp: string,
  options: { purpose: AuthPurpose; displayName?: string }
): Promise<StoredUser> {
  const normalized = normalizeEmail(email);
  const baseUrl = getApiUrl();
  const res = await fetch(new URL("/api/auth/verify-otp", baseUrl).href, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalized,
      otp,
      purpose: options.purpose,
      displayName: options.displayName?.trim() || "ConvoInsight User",
    }),
  });
  if (!res.ok) {
    throw await parseApiError(res);
  }
  const data = await res.json();
  const user = data.user;
  return saveSession(
    user?.email ?? normalized,
    user?.displayName ?? options.displayName
  );
}
