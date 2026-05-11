/**
 * Frontend fetch helper. Wraps fetch() with:
 *   - Automatic JSON parsing
 *   - Standardized error shape from { error, details }
 *   - Optional abort signal for stale-request cancellation
 *
 * Use this everywhere the UI talks to /api/* instead of raw fetch().
 */

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export interface ApiOptions {
  signal?: AbortSignal;
  // Override base URL for testing. Defaults to relative (same-origin).
  baseUrl?: string;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  opts?: ApiOptions,
): Promise<T> {
  const url = (opts?.baseUrl ?? "") + path;
  const init: RequestInit = {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: opts?.signal,
    credentials: "same-origin",
  };

  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.error ?? `${method} ${path} failed (${res.status})`;
    throw new ApiError(message, res.status, json?.details);
  }

  // Our API wraps responses as { data: ..., meta: ... }.
  // Most callers just want `data`. Return it directly.
  return (json?.data ?? json) as T;
}

export const api = {
  get: <T>(path: string, opts?: ApiOptions) => request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>("POST", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: ApiOptions) => request<T>("DELETE", path, undefined, opts),
};