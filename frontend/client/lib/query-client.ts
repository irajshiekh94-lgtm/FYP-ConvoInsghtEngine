import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";

const DEFAULT_API_PORT = "8000";

/** Metro / Expo Go dev host, e.g. 192.168.1.5 from debuggerHost or hostUri. */
function getExpoDevHost(): string | null {
  const candidates: (string | undefined)[] = [
    Constants.expoConfig?.hostUri,
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const host = raw.replace(/^exp:\/\//, "").split(":")[0]?.trim();
    if (
      host &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      !host.includes("/")
    ) {
      return host;
    }
  }
  return null;
}

/**
 * Base URL for the ConvoInsight Python API (FastAPI on port 8000 by default).
 *
 * Set EXPO_PUBLIC_API_URL to the full base, e.g. http://localhost:8000
 * or http://192.168.1.10:8000 for a physical device on the same LAN.
 */
export function getApiUrl(): string {
  let urlStr = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!urlStr) {
    const host = process.env.EXPO_PUBLIC_DOMAIN?.trim();
    if (host) {
      urlStr = /^https?:\/\//i.test(host) ? host : `http://${host}`;
    }
  }

  if (!urlStr) {
    urlStr = `http://127.0.0.1:${DEFAULT_API_PORT}`;
  }

  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `http://${urlStr}`;
  }

  try {
    const url = new URL(urlStr);

    // Default API port when only an IP/hostname was provided
    if (!url.port && (url.protocol === "http:" || url.protocol === "https:")) {
      url.port = DEFAULT_API_PORT;
    }

    // On a physical device, localhost points at the phone — use Metro's LAN IP
    const devHost = getExpoDevHost();
    if (
      devHost &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      url.hostname = devHost;
    }

    const isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.startsWith("192.168.") ||
      url.hostname.startsWith("10.") ||
      url.hostname === "10.0.2.2";

    if (!isLocal && url.protocol === "http:") {
      url.protocol = "https:";
    }

    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }

    return url.href;
  } catch {
    return urlStr.endsWith("/") ? urlStr : `${urlStr}/`;
  }
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
