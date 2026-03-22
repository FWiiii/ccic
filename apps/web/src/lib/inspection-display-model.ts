import { normalizeImageUrls } from "../utils/normalizeImageUrls";
import type { PublicInspectionData } from "./public-inspection";

const normalizeDateString = (value: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  const matched = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matched) {
    return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
};

const inferTraceStatusFromInspection = (inspectionStatus: string) => {
  if (inspectionStatus === "PUBLISHED" || inspectionStatus === "REVOKED") {
    return "COMPLETED" as const;
  }

  if (inspectionStatus === "REVIEWED") {
    return "INSPECTING" as const;
  }

  return "SUBMITTED" as const;
};

export function buildInspectionDisplayModel(
  inspectionData: PublicInspectionData,
  inspectionAgencyFallback: string
) {
  const productImages = normalizeImageUrls(inspectionData.product.images.map((item) => item?.url));

  return {
    bannerImages: productImages,
    traceSampleImages: productImages,
    productName: inspectionData.display?.productName?.trim() || inspectionData.product.name.trim() || "-",
    inspectionAgencyName: inspectionData.inspectionAgencyName?.trim() || inspectionAgencyFallback,
    consignorName: inspectionData.display?.consignorName?.trim() || inspectionData.company.name.trim() || "-",
    verificationDate:
      inspectionData.display?.verificationDate?.trim() ||
      normalizeDateString(inspectionData.inspection.inspectionTime) ||
      "-",
    conclusion: inspectionData.inspection.conclusion?.trim() || undefined,
    currentTraceStatus: inferTraceStatusFromInspection(inspectionData.inspection.status),
  };
}
