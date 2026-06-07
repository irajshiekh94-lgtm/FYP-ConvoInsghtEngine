import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";

/**
 * Base URL for the ConvoInsight Python API (FastAPI on port 8000 by default).
 *
 * Set EXPO_PUBLIC_API_URL to the full base, e.g. http://localhost:8000
 * or http://192.168.1.10:8000 for a physical device on the same LAN.
 *
 * Falls back to EXPO_PUBLIC_DOMAIN (host[:port] only) with http for local hosts.
 */
export function getApiUrl(): string {
  let urlStr = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!urlStr) {
    const host = process.env.EXPO_PUBLIC_DOMAIN?.trim();
    if (host) {
      urlStr = /^https?:\/\//i.test(host) ? host : `http://${host}`;
    }
  }

  // If still not set, default to localhost
  if (!urlStr) {
    urlStr = "http://127.0.0.1:8000/";
  }

  // Ensure it has protocol
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `http://${urlStr}`;
  }

  // Ensure trailing slash
  if (!urlStr.endsWith("/")) {
    urlStr = `${urlStr}/`;
  }

  try {
    const url = new URL(urlStr);

    // Swap localhost/127.0.0.1 with the actual Metro bundler IP if running under Expo Go
    if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && Constants.expoConfig?.hostUri) {
      const metroHost = Constants.expoConfig.hostUri.split(":")[0];
      if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
        url.hostname = metroHost;
      }
    }

    // Replit / production hosts use HTTPS; local dev uses HTTP
    const isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.startsWith("192.168.") ||
      url.hostname.startsWith("10.");

    if (!isLocal && url.protocol === "http:") {
      url.protocol = "https:";
    }

    return url.href;
  } catch {
    return urlStr;
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
