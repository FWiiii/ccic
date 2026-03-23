export const buildPublicInspectionPath = (sn: string) =>
  `/api/v1/public/inspection?sn=${encodeURIComponent(sn)}`;

export const resolveInternalApiBaseUrl = (value = process.env.INTERNAL_API_BASE_URL ?? "") => {
  const normalized = String(value).trim().replace(/\/$/, "");
  if (!normalized) {
    throw new Error("INTERNAL_API_BASE_URL is required for server-side inspection requests.");
  }

  return normalized;
};

export const buildPublicInspectionUrl = (
  sn: string,
  options:
    | { runtime: "client"; publicBaseUrl?: string }
    | { runtime: "server"; internalBaseUrl?: string }
) => {
  const path = buildPublicInspectionPath(sn);

  if (options.runtime === "client") {
    const base = String(options.publicBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
      .trim()
      .replace(/\/$/, "");
    return base ? `${base}${path}` : path;
  }

  return `${resolveInternalApiBaseUrl(options.internalBaseUrl)}${path}`;
};
