import { useMemo } from "react";
import type { PublicInspectionData } from "../api/publicInspection";
import type { TraceStatus } from "../components/tabs/TraceInfoTab";

const isTraceStatus = (value: unknown): value is TraceStatus =>
  value === "SUBMITTED" || value === "INSPECTING" || value === "COMPLETED";

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
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
};

const inferTraceStatusFromInspection = (inspectionStatus: string): TraceStatus => {
  if (inspectionStatus === "PUBLISHED" || inspectionStatus === "REVOKED") {
    return "COMPLETED";
  }

  if (inspectionStatus === "REVIEWED") {
    return "INSPECTING";
  }

  return "SUBMITTED";
};

interface UseInspectionDisplayModelOptions {
  inspectionData: PublicInspectionData | null;
  inspectionAgencyFallback: string;
}

export function useInspectionDisplayModel({
  inspectionData,
  inspectionAgencyFallback,
}: UseInspectionDisplayModelOptions) {
  const bannerImages = useMemo(() => {
    const displayImages = (inspectionData?.display?.indexBannerImages ?? [])
      .map((item) => String(item?.url ?? "").trim())
      .filter(Boolean);
    const fallbackImages = (inspectionData?.images ?? [])
      .map((item) => String(item?.url ?? "").trim())
      .filter(Boolean);

    const merged = displayImages.length > 0 ? displayImages : fallbackImages;
    return Array.from(new Set(merged));
  }, [inspectionData]);

  const traceSampleImages = useMemo(() => {
    const inspectionImages = (inspectionData?.images ?? [])
      .map((item) => String(item?.url ?? "").trim())
      .filter(Boolean);

    if (inspectionImages.length > 0) {
      return Array.from(new Set(inspectionImages));
    }

    const displayImages = (inspectionData?.display?.indexBannerImages ?? [])
      .map((item) => String(item?.url ?? "").trim())
      .filter(Boolean);

    return Array.from(new Set(displayImages));
  }, [inspectionData]);

  const productName =
    inspectionData?.display?.productName?.trim() || inspectionData?.product?.name?.trim() || "-";

  const inspectionAgencyName = inspectionData?.inspectionAgencyName?.trim() || inspectionAgencyFallback;

  const consignorName =
    inspectionData?.display?.consignorName?.trim() || inspectionData?.company?.name?.trim() || "-";

  const verificationDate =
    inspectionData?.display?.verificationDate?.trim() ||
    normalizeDateString(inspectionData?.inspection?.inspectionTime ?? "") ||
    "-";

  const conclusion = inspectionData?.inspection?.conclusion?.trim() || undefined;

  const currentTraceStatus = useMemo<TraceStatus>(() => {
    const statusFromApi = inspectionData?.display?.traceInfo?.currentStatus;
    if (isTraceStatus(statusFromApi)) {
      return statusFromApi;
    }

    return inferTraceStatusFromInspection(String(inspectionData?.inspection?.status ?? ""));
  }, [inspectionData]);

  return {
    bannerImages,
    traceSampleImages,
    productName,
    inspectionAgencyName,
    consignorName,
    verificationDate,
    conclusion,
    currentTraceStatus,
  };
}