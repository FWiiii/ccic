import { InspectionErrorState } from "../src/components/result/InspectionErrorState";
import { InspectionResultClient } from "../src/components/result/InspectionResultClient";
import { buildInspectionDisplayModel } from "../src/lib/inspection-display-model";
import { PublicInspectionRequestError, fetchPublicInspectionBySn } from "../src/lib/public-inspection";
import { SearchPage } from "../src/views/SearchPage";
import { TraceNotFoundPage } from "../src/views/TraceNotFoundPage";

export const dynamic = "force-dynamic";

const INSPECTION_AGENCY_FALLBACK = "中国检验认证集团奢侈品鉴定中心";

interface HomePageProps {
  searchParams?: {
    sn?: string | string[];
  };
}

const normalizeQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }

  return String(value ?? "").trim();
};

export default async function Page({ searchParams }: HomePageProps) {
  const sn = normalizeQueryValue(searchParams?.sn);

  if (!sn) {
    return <SearchPage expectedCode="" />;
  }

  try {
    const inspectionData = await fetchPublicInspectionBySn(sn, { runtime: "server" });
    const model = buildInspectionDisplayModel(inspectionData, INSPECTION_AGENCY_FALLBACK);
    return <InspectionResultClient {...model} />;
  } catch (error) {
    if (error instanceof PublicInspectionRequestError && error.status === 404) {
      return <TraceNotFoundPage traceCode={sn} serviceProvider={INSPECTION_AGENCY_FALLBACK} />;
    }

    const message = error instanceof Error && error.message ? error.message : "查询失败，请稍后重试。";
    return <InspectionErrorState message={message} />;
  }
}
