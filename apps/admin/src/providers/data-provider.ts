

export const TOKEN_STORAGE_KEY = "ccic_admin_token";
export const USER_STORAGE_KEY = "ccic_admin_user";

const API_URL = "/api/admin";

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

function normalizeErrorMessage(
  payload: { message?: unknown; error?: unknown } | null,
  responseText: string,
  status: number
) {
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

function toQueryParams(filters: Array<Record<string, unknown>> = []) {
  const search = new URLSearchParams();

  for (const filter of filters) {
    const field = String(filter?.field ?? "").trim();
    const operator = String(filter?.operator ?? "eq").trim();
    const value = filter?.value;

    if (!field || value === undefined || value === null || value === "") {
      continue;
    }

    if (operator === "eq") {
      search.set(field, String(value));
    }
  }

  return search;
}

function applyFilters(rows: Array<Record<string, unknown>>, filters: Array<Record<string, unknown>> = []) {
  return rows.filter((row) => {
    for (const filter of filters) {
      const field = String(filter?.field ?? "").trim();
      const operator = String(filter?.operator ?? "eq").trim();
      const value = filter?.value;

      if (!field || value === undefined || value === null || value === "") {
        continue;
      }

      const current = row[field];

      if (operator === "eq" && String(current ?? "") !== String(value)) {
        return false;
      }

      if (operator === "contains" && !String(current ?? "").includes(String(value))) {
        return false;
      }
    }

    return true;
  });
}

function applySorters(rows: Array<Record<string, unknown>>, sorters: Array<Record<string, unknown>> = []) {
  if (!sorters.length) {
    return rows;
  }

  const sorted = [...rows];
  sorted.sort((left, right) => {
    for (const sorter of sorters) {
      const field = String(sorter?.field ?? "").trim();
      const order = String(sorter?.order ?? "asc").toLowerCase();
      if (!field) {
        continue;
      }

      const l = left[field];
      const r = right[field];

      if (l === r) {
        continue;
      }

      if (l === undefined || l === null) {
        return order === "desc" ? 1 : -1;
      }

      if (r === undefined || r === null) {
        return order === "desc" ? -1 : 1;
      }

      if (l > r) {
        return order === "desc" ? -1 : 1;
      }

      if (l < r) {
        return order === "desc" ? 1 : -1;
      }
    }

    return 0;
  });

  return sorted;
}

function ensureArray(input: unknown): Array<Record<string, unknown>> {
  return Array.isArray(input) ? (input as Array<Record<string, unknown>>) : [];
}

async function request<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Content-Type") && init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
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

async function listResource(resource: string, query?: URLSearchParams) {
  const suffix = query && query.size ? `?${query.toString()}` : "";
  const data = await request<unknown>(`${API_URL}/${resource}${suffix}`, { method: "GET" });
  return ensureArray(data);
}

export const dataProvider: any = {
  getApiUrl: () => API_URL,

  getList: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const filters = Array.isArray(params.filters) ? (params.filters as Array<Record<string, unknown>>) : [];
    const sorters = Array.isArray(params.sorters) ? (params.sorters as Array<Record<string, unknown>>) : [];

    const query = toQueryParams(filters);
    let rows = await listResource(resource, query);
    rows = applyFilters(rows, filters);
    rows = applySorters(rows, sorters);

    const pagination = (params.pagination ?? {}) as Record<string, unknown>;
    const mode = String(pagination.mode ?? "server");
    const current = Number(pagination.current ?? 1);
    const pageSize = Number(pagination.pageSize ?? 10);

    const total = rows.length;
    const pagedRows =
      mode === "off"
        ? rows
        : rows.slice(Math.max(0, (current - 1) * pageSize), Math.max(0, (current - 1) * pageSize) + pageSize);

    return {
      data: pagedRows,
      total,
    };
  },

  getOne: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const id = String(params.id ?? "");

    const rows = await listResource(resource);
    const data = rows.find((item) => String(item.id ?? "") === id);

    if (!data) {
      throw {
        message: "Record not found",
        statusCode: 404,
      };
    }

    return { data };
  },

  getMany: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const ids = Array.isArray(params.ids) ? params.ids.map((item: unknown) => String(item)) : [];
    const rows = await listResource(resource);

    return {
      data: rows.filter((item) => ids.includes(String(item.id ?? ""))),
    };
  },

  getManyReference: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const target = String(params.target ?? "");
    const id = String(params.id ?? "");
    const baseFilters = Array.isArray(params.filters) ? (params.filters as Array<Record<string, unknown>>) : [];

    return dataProvider.getList({
      ...params,
      resource,
      filters: [...baseFilters, { field: target, operator: "eq", value: id }],
    });
  },

  create: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const variables = (params.variables ?? {}) as Record<string, unknown>;

    const data = await request<Record<string, unknown>>(`${API_URL}/${resource}`, {
      method: "POST",
      body: JSON.stringify(variables),
    });

    return {
      data: data ?? variables,
    };
  },

  update: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const id = String(params.id ?? "");
    const variables = (params.variables ?? {}) as Record<string, unknown>;

    const data = await request<Record<string, unknown>>(`${API_URL}/${resource}/${id}`, {
      method: "PUT",
      body: JSON.stringify(variables),
    });

    return {
      data: data ?? { ...variables, id },
    };
  },

  deleteOne: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const id = String(params.id ?? "");

    const data = await request<Record<string, unknown>>(`${API_URL}/${resource}/${id}`, {
      method: "DELETE",
    });

    return {
      data: data ?? { id },
    };
  },

  updateMany: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const ids = Array.isArray(params.ids) ? params.ids : [];

    const results = await Promise.all(
      ids.map((id: unknown) =>
        dataProvider.update({
          resource,
          id,
          variables: params.variables,
        })
      )
    );

    return {
      data: results.map((item) => item.data),
    };
  },

  deleteMany: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const ids = Array.isArray(params.ids) ? params.ids : [];

    const results = await Promise.all(
      ids.map((id: unknown) =>
        dataProvider.deleteOne({
          resource,
          id,
        })
      )
    );

    return {
      data: results.map((item) => item.data),
    };
  },

  custom: async (params: any): Promise<any> => {
    const method = String(params.method ?? "get").toUpperCase();
    const query = (params.query ?? {}) as Record<string, unknown>;
    const payload = (params.payload ?? params.values ?? undefined) as Record<string, unknown> | undefined;

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    }

    const suffix = search.size ? `?${search.toString()}` : "";
    const url = String(params.url ?? "");
    const path = url.startsWith("http") || url.startsWith("/") ? url : `${API_URL}/${url}`;

    const data = await request<Record<string, unknown>>(`${path}${suffix}`, {
      method,
      body: payload !== undefined && method !== "GET" ? JSON.stringify(payload) : undefined,
    });

    return {
      data: data ?? {},
    };
  },
};

