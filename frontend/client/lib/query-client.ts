import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const DEFAULT_API_PORT = "8000";

type ExpoExtra = {
  devApiHost?: string;
  devApiUrl?: string;
};

function getExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function parseHostFromRaw(raw: string): string | null {
  let s = raw.trim();
  s = s.replace(/^exp:\/\//, "");
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0] ?? s;
  const host = s.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  if (host.includes("exp.direct") || host.includes("ngrok")) return null;
  return host;
}

/** Metro / Expo Go dev host from runtime manifest. */
function getExpoDevHost(): string | null {
  const c = Constants as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: {
      extra?: {
        expoGo?: { debuggerHost?: string };
        expoClient?: { hostUri?: string };
      };
    };
  };

  const candidates = [
    c.expoConfig?.hostUri,
    c.manifest2?.extra?.expoClient?.hostUri,
    c.expoGoConfig?.debuggerHost,
    c.manifest?.debuggerHost,
    c.manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const host = parseHostFromRaw(raw);
    if (host) return host;
  }
  return null;
}

/** IP baked in at Metro start via app.config.js — most reliable on SDK 52. */
function getInjectedDevHost(): string | null {
  const extra = getExtra();
  const fromUrl = extra.devApiUrl?.trim();
  if (fromUrl) {
    try {
      return new URL(fromUrl).hostname;
    } catch {
      /* ignore */
    }
  }
  const host = extra.devApiHost?.trim();
  if (host && host !== "127.0.0.1") return host;
  return null;
}

function isPrivateLanHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "10.0.2.2" ||
    hostname.startsWith("192.168.") ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname.endsWith(".local")
  );
}

function normalizeApiBase(urlStr: string): string {
  let normalized = urlStr.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }

  const url = new URL(normalized);

  if (!url.port && (url.protocol === "http:" || url.protocol === "https:")) {
    url.port = DEFAULT_API_PORT;
  }

  if (!isPrivateLanHost(url.hostname) && url.protocol === "http:") {
    url.protocol = "https:";
  }

  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }

  return url.href;
}

let _loggedApiUrl: string | null = null;

export function getApiUrlDebugInfo(): {
  url: string;
  source: string;
  injectedHost: string | null;
  expoHost: string | null;
} {
  const url = getApiUrl();
  const injectedHost = getInjectedDevHost();
  const expoHost = getExpoDevHost();
  let source = "fallback";
  if (__DEV__) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (envUrl) {
      try {
        if (!isPrivateLanHost(new URL(normalizeApiBase(envUrl)).hostname)) {
          source = "EXPO_PUBLIC_API_URL (cloud)";
        }
      } catch {
        /* ignore */
      }
    }
    if (source === "fallback") {
      if (!Device.isDevice && Platform.OS === "android") source = "android-emulator";
      else if (!Device.isDevice && Platform.OS === "ios") source = "ios-simulator";
      else if (injectedHost) source = "app.config.js (Metro LAN IP)";
      else if (expoHost) source = "Expo debuggerHost";
      else source = "localhost fallback";
    }
  } else if (process.env.EXPO_PUBLIC_API_URL) {
    source = "EXPO_PUBLIC_API_URL";
  }
  return { url, source, injectedHost, expoHost };
}

/**
 * Base URL for the ConvoInsight Python API (FastAPI on port 8000 by default).
 */
export function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const envDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();

  if (__DEV__) {
    // Cloud / production override in dev
    if (envUrl) {
      try {
        const parsed = new URL(normalizeApiBase(envUrl));
        if (!isPrivateLanHost(parsed.hostname)) {
          return finalizeUrl(normalizeApiBase(envUrl));
        }
      } catch {
        /* ignore */
      }
    }

    // Metro-injected LAN IP (app.config.js) — best for physical phone on any Wi‑Fi
    const injected = getInjectedDevHost();
    if (injected) {
      return finalizeUrl(`http://${injected}:${DEFAULT_API_PORT}/`);
    }

    const expoHost = getExpoDevHost();
    if (expoHost) {
      return finalizeUrl(`http://${expoHost}:${DEFAULT_API_PORT}/`);
    }

    // Simulators / emulators only (use expo-device — Constants.isDevice is unreliable in Expo Go)
    if (!Device.isDevice && Platform.OS === "android") {
      return finalizeUrl(`http://10.0.2.2:${DEFAULT_API_PORT}/`);
    }
    if (!Device.isDevice && Platform.OS === "ios") {
      return finalizeUrl(`http://127.0.0.1:${DEFAULT_API_PORT}/`);
    }
  }

  if (envUrl) {
    return finalizeUrl(normalizeApiBase(envUrl));
  }

  if (envDomain) {
    const withScheme = /^https?:\/\//i.test(envDomain)
      ? envDomain
      : `http://${envDomain}`;
    return finalizeUrl(normalizeApiBase(withScheme));
  }

  return finalizeUrl(`http://127.0.0.1:${DEFAULT_API_PORT}/`);
}

function finalizeUrl(url: string): string {
  if (__DEV__ && _loggedApiUrl !== url) {
    _loggedApiUrl = url;
    console.log(`[ConvoInsight] API → ${url.replace(/\/$/, "")}`);
  }
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
