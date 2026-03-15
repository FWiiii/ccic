import { useEffect, useMemo, useState } from "react";
import { fetchInspectionBySn, type PublicInspectionData } from "./api/publicInspection";
import { HeroImage } from "./components/HeroImage";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { PageFooter } from "./components/PageFooter";
import { ProductCarousel } from "./components/ProductCarousel";
import { ProductSummary } from "./components/ProductSummary";
import { TopTabs, type TabKey } from "./components/TopTabs";
import { CompanyInfoTab } from "./components/tabs/CompanyInfoTab";
import { ProductInfoTab } from "./components/tabs/ProductInfoTab";
import { TraceInfoTab, type TraceStatus } from "./components/tabs/TraceInfoTab";

const INSPECTION_AGENCY_FALLBACK =
  "\u4e2d\u56fd\u68c0\u9a8c\u8ba4\u8bc1\u96c6\u56e2\u5962\u4f88\u54c1\u9274\u5b9a\u4e2d\u5fc3";

const readSnFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("sn")?.trim() ?? "";
};

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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("taba");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [querySn, setQuerySn] = useState(() => readSnFromUrl());
  const [inspectionData, setInspectionData] = useState<PublicInspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const onPopState = () => setQuerySn(readSnFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const sn = querySn.trim();

    if (!sn) {
      setInspectionData(null);
      setErrorMessage("\u94fe\u63a5\u7f3a\u5c11 sn \u53c2\u6570\uff0c\u8bf7\u68c0\u67e5\u4e8c\u7ef4\u7801\u5730\u5740\u3002");
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    setIsLoading(true);
    setErrorMessage("");

    fetchInspectionBySn(sn, abortController.signal)
      .then((data) => {
        setInspectionData(data);
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : "\u67e5\u8be2\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
        setInspectionData(null);
        setErrorMessage(message);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [querySn]);

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

  const inspectionAgencyName = inspectionData?.inspectionAgencyName?.trim() || INSPECTION_AGENCY_FALLBACK;

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

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <HeroImage />
        <PageFooter />

        {isLoading ? (
          <div className="app-query-status">
            {"\u6b63\u5728\u6839\u636e SN \u67e5\u8be2\u9274\u5b9a\u7ed3\u679c..."}
          </div>
        ) : null}

        <div className="content contentDivOne native-scroll" style={{ paddingTop: 0 }}>
          <ProductCarousel images={bannerImages} onPreview={setPreviewImage} />
          <ProductSummary productName={productName} inspectionAgencyName={inspectionAgencyName} />
          <TopTabs activeTab={activeTab} onChange={setActiveTab} />

          <div className="c-clear-left">
            <div className="tabs app-tabs-lock" style={{ fontSize: "12px" }}>
              <div
                id="tab1"
                className={`tab taba app-tab-panel ${activeTab === "taba" ? "active is-active" : "is-inactive"}`}
              >
                <ProductInfoTab
                  consignorName={consignorName}
                  verificationDate={verificationDate}
                  conclusion={conclusion}
                />
              </div>

              <div
                id="tab2"
                className={`tab tabb app-tab-panel ${activeTab === "tabb" ? "active is-active" : "is-inactive"}`}
              >
                <CompanyInfoTab onPreview={setPreviewImage} />
              </div>

              <div
                id="tab3"
                className={`tab tabc autoheigth app-tab-panel ${activeTab === "tabc" ? "active is-active" : "is-inactive"}`}
              >
                <TraceInfoTab
                  currentStatus={currentTraceStatus}
                  recordDate={verificationDate}
                  inspectionDepartment={inspectionAgencyName}
                  conclusion={conclusion}
                  sampleImages={traceSampleImages}
                  onPreview={setPreviewImage}
                />
              </div>
            </div>
          </div>
        </div>

        <div id="codeunsetshow" className="unsetshowdiv" style={{ display: errorMessage ? "block" : "none" }}>
          <div className="unsetshowdoublediv">
            <div className="unsetshowthreediv">
              <span>
                {errorMessage ||
                  "\u6b64\u8ffd\u6eaf\u7801\u65e0\u6548\u3002\u53ef\u8054\u7cfb\u4e2d\u68c0\u6eaf\u6e90\u670d\u52a1\u70ed\u7ebf0512-67998071\u54a8\u8be2\u3002"}
              </span>
            </div>
            <div className="ht50">
              <div id="enterccic" className="unsetshowfourdiv">
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>

        <div id="download-files-dialog" className="unsetshowdiv">
          <div className="unsetshowdoublediv">
            <div className="unsetshowthreediv">
              <span>
                {"\u4e0b\u8f7d\u8be5\u6587\u4ef6\u5c06\u4ea7\u751f"}
                <i className="c-font-normal" id="file-size"></i>
                {"\u7684\u6d41\u91cf"}
              </span>
              <span className="c-pt-0">{"\u662f\u5426\u786e\u8ba4\u4e0b\u8f7d?"}</span>
            </div>
            <div className="ht50">
              <a
                id="file-download-btn"
                className="download-btn-frame"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                <span>{"\u786e\u8ba4"}</span>
              </a>
              <div id="file-cancal-btn" className="download-btn-frame">
                <span>{"\u53d6\u6d88"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}