import type { AuthBindings } from "@refinedev/core";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./data-provider";

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
  const raw = localStorage.getItem(USER_STORAGE_KEY);
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
    const response = await fetch("/api/admin/auth/login", {
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

    localStorage.setItem(TOKEN_STORAGE_KEY, payload.data.token);
    if (payload.data.user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.data.user));
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);

    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

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
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);

      return {
        logout: true,
        redirectTo: "/login",
        error,
      };
    }

    return { error };
  },
};
