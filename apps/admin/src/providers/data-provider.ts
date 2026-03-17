import { buildApiUrl, requestJson } from "./api-client";
import {
  clearAuthToken,
  clearStoredUser,
  readAuthToken,
  readStoredUserRaw,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  writeAuthToken,
  writeStoredUserRaw,
} from "./auth-storage";

export {
  clearAuthToken,
  clearStoredUser,
  readAuthToken,
  readStoredUserRaw,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  writeAuthToken,
  writeStoredUserRaw,
};

const API_URL = "/api/admin";

type Row = Record<string, unknown>;

type ListPayload = {
  data?: unknown;
  total?: unknown;
};

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

async function listResource(resource: string, query?: URLSearchParams) {
  const suffix = query && query.size ? `?${query.toString()}` : "";
  return requestJson<unknown>(`${API_URL}/${resource}${suffix}`, { method: "GET" });
}

export const dataProvider: any = {
  getApiUrl: () => buildApiUrl(API_URL),

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

    const data = await requestJson<Record<string, unknown>>(`${API_URL}/${resource}`, {
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

    const data = await requestJson<Record<string, unknown>>(`${API_URL}/${resource}/${id}`, {
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

    const data = await requestJson<Record<string, unknown>>(`${API_URL}/${resource}/${id}`, {
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

    const data = await requestJson<Record<string, unknown>>(`${path}${suffix}`, {
      method,
      body: payload !== undefined && method !== "GET" ? JSON.stringify(payload) : undefined,
    });

    return {
      data: data ?? {},
    };
  },
};
