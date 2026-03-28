/**
 * Thin REST client for AgentDesk API with session auth
 */
import { getBaseUrl } from "./config.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}: ${JSON.stringify(body)}`);
    this.name = "ApiError";
  }
}

// ── Session state ──────────────────────────────────────────────

let sessionCookie: string | null = null;
let csrfToken: string | null = null;

/** Authenticate with the server (loopback → cookie + CSRF token) */
async function ensureSession(): Promise<void> {
  if (sessionCookie && csrfToken) return;

  const url = `${getBaseUrl()}/api/auth/session`;
  const res = await fetch(url);
  if (!res.ok) throw new ApiError(res.status, await res.json());

  // Extract Set-Cookie header
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    // Parse "agentdesk_session=<token>; ..."
    const match = setCookie.match(/agentdesk_session=([^;]+)/);
    if (match) sessionCookie = `agentdesk_session=${match[1]}`;
  }

  const json = (await res.json()) as { csrf_token?: string };
  csrfToken = json.csrf_token ?? null;
}

// ── Request helper ─────────────────────────────────────────────

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  await ensureSession();

  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {};

  if (sessionCookie) headers["Cookie"] = sessionCookie;
  if (csrfToken && method !== "GET") headers["x-csrf-token"] = csrfToken;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>("POST", path, body),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>("PATCH", path, body),
  del: <T = unknown>(path: string) => request<T>("DELETE", path),
};

/** Check if server is reachable */
export async function checkServer(): Promise<boolean> {
  try {
    const url = `${getBaseUrl()}/api/health`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}
