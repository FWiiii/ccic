export interface PublicInspectionImage {
  id: string;
  url: string;
  name?: string;
  scene?: string;
  sortOrder?: number;
}

export interface PublicInspectionData {
  inspectionAgencyName: string;
  inspection: {
    id: string;
    sn: string;
    inspectionTime: string;
    status: string;
    result: string;
    conclusion?: string;
  };
  product: {
    id: string;
    name: string;
    images: PublicInspectionImage[];
  };
  company: {
    id: string;
    name: string;
  };
  display?: {
    productName?: string;
    consignorName?: string;
    verificationDate?: string;
  };
}

interface PublicInspectionResponse {
  data: PublicInspectionData;
  message?: string;
}
export class PublicInspectionRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicInspectionRequestError";
    this.status = status;
  }
}

const buildInspectionRequestUrl = (sn: string) => {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
  const path = `/api/v1/public/inspection?sn=${encodeURIComponent(sn)}`;
  return apiBase ? `${apiBase}${path}` : path;
};

export async function fetchInspectionBySn(sn: string, signal?: AbortSignal): Promise<PublicInspectionData> {
  const response = await fetch(buildInspectionRequestUrl(sn), { signal });
  const payload = (await response.json().catch(() => ({}))) as Partial<PublicInspectionResponse>;

  if (!response.ok) {
    const message =
      typeof payload.message === "string" && payload.message
        ? payload.message
        : `查询失败(HTTP ${response.status})`;

    throw new PublicInspectionRequestError(message, response.status);
  }

  if (!payload.data) {
    throw new Error("接口未返回鉴定数据");
  }

  return payload.data;
}
