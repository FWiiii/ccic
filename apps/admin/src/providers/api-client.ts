import { readAuthToken } from "./auth-storage";

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
};

function safeParseJson<T>(text: string): T | null {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function normalizeErrorMessage(payload: ApiErrorPayload | null, responseText: string, status: number) {
  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    const joined = payload.message.filter((item) => typeof item === "string").join("; ").trim();
    if (joined) {
      return joined;
    }
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return responseText.trim() ? `Request failed (${status})` : "Empty response from API service";
}

const readApiBaseUrl = () => String(import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

const isAbsoluteUrl = (value: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);

export function buildApiUrl(path: string) {
  const normalizedPath = String(path ?? "").trim();
  if (!normalizedPath || isAbsoluteUrl(normalizedPath)) {
    return normalizedPath;
  }

  const apiBase = readApiBaseUrl();
  if (!apiBase) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("/")) {
    return `${apiBase}${normalizedPath}`;
  }

  return `${apiBase}/${normalizedPath}`;
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit & { includeAuth?: boolean }
): Promise<T | undefined> {
  const includeAuth = init?.includeAuth !== false;
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Content-Type") && init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (includeAuth) {
    const token = readAuthToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined;
  }

  const responseText = await response.text();
  const payload = safeParseJson<{ data?: T; message?: unknown; error?: unknown }>(responseText);

  if (!response.ok) {
    throw {
      message: normalizeErrorMessage(payload, responseText, response.status),
      statusCode: response.status,
    };
  }

  if (!payload) {
    return undefined;
  }

  if (payload.data !== undefined) {
    return payload.data;
  }

  return payload as T;
}
