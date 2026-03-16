export const TOKEN_STORAGE_KEY = "ccic_admin_token";
export const USER_STORAGE_KEY = "ccic_admin_user";

const API_URL = "/api/admin";

type Row = Record<string, unknown>;

type ListPayload = {
  data?: unknown;
  total?: unknown;
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

function ensureArray(input: unknown): Row[] {
  return Array.isArray(input) ? (input as Row[]) : [];
}

function normalizeTotal(input: unknown, fallback: number) {
  const total = Number(input);
  if (!Number.isFinite(total)) {
    return fallback;
  }

  return Math.max(0, Math.floor(total));
}

function parseListResult(input: unknown) {
  if (Array.isArray(input)) {
    const rows = ensureArray(input);
    return {
      data: rows,
      total: rows.length,
    };
  }

  const payload = (input ?? {}) as ListPayload;
  const rows = ensureArray(payload.data);
  return {
    data: rows,
    total: normalizeTotal(payload.total, rows.length),
  };
}

function toQueryParams({
  filters,
  sorters,
  pagination,
}: {
  filters?: Array<Record<string, unknown>>;
  sorters?: Array<Record<string, unknown>>;
  pagination?: Record<string, unknown>;
}) {
  const search = new URLSearchParams();

  for (const filter of filters ?? []) {
    const field = String(filter?.field ?? "").trim();
    const operator = String(filter?.operator ?? "eq").trim();
    const rawValue = filter?.value;

    if (!field || rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (operator === "eq" || operator === "contains") {
      search.set(field, String(rawValue));
      continue;
    }

    if (operator === "in" && Array.isArray(rawValue)) {
      const values = rawValue.map((item) => String(item ?? "").trim()).filter(Boolean);
      if (values.length > 0) {
        search.set(field, values.join(","));
      }
    }
  }

  const firstSorter = (sorters ?? []).find((item) => String(item?.field ?? "").trim());
  if (firstSorter) {
    const sortBy = String(firstSorter.field ?? "").trim();
    const sortOrder = String(firstSorter.order ?? "asc").toLowerCase() === "asc" ? "asc" : "desc";
    search.set("sortBy", sortBy);
    search.set("sortOrder", sortOrder);
  }

  const mode = String(pagination?.mode ?? "server");
  if (mode !== "off") {
    const current = Math.max(1, Number(pagination?.current ?? 1));
    const pageSize = Math.max(1, Number(pagination?.pageSize ?? 10));
    search.set("page", String(current));
    search.set("pageSize", String(pageSize));
  }

  return search;
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
  return request<unknown>(`${API_URL}/${resource}${suffix}`, { method: "GET" });
}

export const dataProvider: any = {
  getApiUrl: () => API_URL,

  getList: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const query = toQueryParams({
      filters: Array.isArray(params.filters) ? params.filters : [],
      sorters: Array.isArray(params.sorters) ? params.sorters : [],
      pagination: (params.pagination ?? {}) as Record<string, unknown>,
    });

    const raw = await listResource(resource, query);
    const { data, total } = parseListResult(raw);

    return { data, total };
  },

  getOne: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const id = String(params.id ?? "").trim();

    const query = new URLSearchParams();
    query.set("id", id);
    query.set("page", "1");
    query.set("pageSize", "1");

    const raw = await listResource(resource, query);
    const { data } = parseListResult(raw);
    const row = data[0];

    if (!row) {
      throw {
        message: "Record not found",
        statusCode: 404,
      };
    }

    return { data: row };
  },

  getMany: async (params: any): Promise<any> => {
    const resource = String(params.resource ?? "");
    const ids = Array.isArray(params.ids)
      ? params.ids.map((item: unknown) => String(item ?? "").trim()).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return { data: [] };
    }

    const query = new URLSearchParams();
    query.set("ids", ids.join(","));

    const raw = await listResource(resource, query);
    const { data } = parseListResult(raw);

    return { data };
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

