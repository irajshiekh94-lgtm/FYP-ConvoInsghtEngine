import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Base URL for the ConvoInsight Python API (FastAPI on port 8000 by default).
 *
 * Set EXPO_PUBLIC_API_URL to the full base, e.g. http://localhost:8000
 * or http://192.168.1.10:8000 for a physical device on the same LAN.
 *
 * Falls back to EXPO_PUBLIC_DOMAIN (host[:port] only) with http for local hosts.
 */
export function getApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) {
    return explicit.endsWith("/") ? explicit : `${explicit}/`;
  }

  const host = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!host) {
    throw new Error(
      "Set EXPO_PUBLIC_API_URL (e.g. http://localhost:8000) or EXPO_PUBLIC_DOMAIN"
    );
  }

  const withProtocol = /^https?:\/\//i.test(host) ? host : `http://${host}`;
  const url = new URL(withProtocol);

  // Replit / production hosts use HTTPS; local dev uses HTTP
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.startsWith("192.168.") ||
    url.hostname.startsWith("10.");

  if (!/^https?:\/\//i.test(host) && !isLocal) {
    url.protocol = "https:";
  }

  return url.href.endsWith("/") ? url.href : `${url.href}/`;
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
