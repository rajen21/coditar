import type { ApiErrorBody } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_STORAGE_KEY = "coditar_token";

export class ApiError extends Error {
  status: number;
  details?: ApiErrorBody["details"];

  constructor(status: number, message: string, details?: ApiErrorBody["details"]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    throw new ApiError(res.status, body?.error ?? res.statusText, body?.details);
  }

  return data as T;
}
