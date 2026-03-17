import type { AuthBindings } from "@refinedev/core";
import {
  clearAuthToken,
  clearStoredUser,
  readAuthToken,
  readStoredUserRaw,
  writeAuthToken,
  writeStoredUserRaw,
} from "./data-provider";
import { buildApiUrl } from "./api-client";

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

function readStoredUser() {
  const raw = readStoredUserRaw();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const authProvider: AuthBindings = {
  login: async ({ username, password }) => {
    const response = await fetch(buildApiUrl("/api/admin/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const responseText = await response.text();
    const payload = safeParseJson<{
      data?: {
        token: string;
        user?: Record<string, unknown>;
      };
      message?: string;
    }>(responseText);

    if (!response.ok || !payload?.data?.token) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message:
            payload?.message ||
            (responseText.trim() ? `Login failed (${response.status})` : "Empty response from API service"),
        },
      };
    }

    writeAuthToken(payload.data.token);
    if (payload.data.user) {
      writeStoredUserRaw(JSON.stringify(payload.data.user));
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },

  logout: async () => {
    clearAuthToken();
    clearStoredUser();

    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const token = readAuthToken();

    if (token) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: "/login",
      error: {
        name: "CheckError",
        message: "Not authenticated",
      },
    };
  },

  getPermissions: async () => {
    const user = readStoredUser();
    return user?.role;
  },

  getIdentity: async () => {
    const user = readStoredUser();

    if (!user) {
      return null;
    }

    return {
      id: String(user.id ?? ""),
      name: String(user.displayName ?? user.username ?? "Admin"),
      avatar: undefined,
    };
  },

  onError: async (error) => {
    const statusCode = Number((error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status ?? 0);

    if (statusCode === 401 || statusCode === 403) {
      clearAuthToken();
      clearStoredUser();

      return {
        logout: true,
        redirectTo: "/login",
        error,
      };
    }

    return { error };
  },
};
