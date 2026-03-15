export type TraceStatus = "SUBMITTED" | "INSPECTING" | "COMPLETED";

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
  };
  company: {
    id: string;
    name: string;
  };
  images: PublicInspectionImage[];
  display?: {
    indexBannerImages?: PublicInspectionImage[];
    productName?: string;
    consignorName?: string;
    verificationDate?: string;
    traceInfo?: {
      currentStatus?: TraceStatus;
      steps?: Array<{
        status: TraceStatus;
        label: string;
        reached: boolean;
      }>;
    };
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
        : `\u67e5\u8be2\u5931\u8d25\uff08HTTP ${response.status}\uff09`;

    throw new PublicInspectionRequestError(message, response.status);
  }

  if (!payload.data) {
    throw new Error("\u63a5\u53e3\u672a\u8fd4\u56de\u9274\u5b9a\u6570\u636e");
  }

  return payload.data;
}

