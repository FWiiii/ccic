import { buildPublicInspectionUrl } from "./api-base-url";

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
    id?: string;
    sn?: string;
    inspectionTime: string;
    status: string;
    result: string;
    conclusion?: string;
  };
  product: {
    id?: string;
    name: string;
    images: PublicInspectionImage[];
  };
  company: {
    id?: string;
    name: string;
  };
  display?: {
    productName?: string;
    consignorName?: string;
    verificationDate?: string;
  };
}

export class PublicInspectionRequestError extends Error {
  constructor(message: string, readonly status: number, cause?: unknown) {
    super(message);
    this.name = "PublicInspectionRequestError";

    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export async function fetchPublicInspectionBySn(
  sn: string,
  options: { runtime: "server"; internalBaseUrl?: string } | { runtime: "client"; publicBaseUrl?: string }
): Promise<PublicInspectionData> {
  let response: Response;
  try {
    response = await fetch(buildPublicInspectionUrl(sn, options), {
      cache: "no-store",
    });
  } catch (error) {
    throw new PublicInspectionRequestError("查询失败(网络异常)", 0, error);
  }

  const payload = (await response.json().catch(() => ({}))) as { data?: unknown; message?: string };

  if (!response.ok) {
    throw new PublicInspectionRequestError(
      typeof payload.message === "string" && payload.message ? payload.message : `查询失败(HTTP ${response.status})`,
      response.status
    );
  }

  if (!payload.data) {
    throw new Error("接口未返回鉴定数据");
  }

  return payload.data as PublicInspectionData;
}
