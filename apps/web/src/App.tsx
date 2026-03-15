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

const INSPECTION_AGENCY_FALLBACK = "中国检验认证集团奢侈品鉴定中心";

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
      setErrorMessage("链接缺少 sn 参数，请检查二维码地址。");
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
          error instanceof Error && error.message ? error.message : "查询失败，请稍后重试。";
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
          <div className="app-query-status">{"正在根据 SN 查询鉴定结果..."}</div>
        ) : null}

        <div className="content contentDivOne native-scroll" style={{ paddingTop: 0 }}>
          <ProductCarousel images={bannerImages} onPreview={setPreviewImage} />
          <ProductSummary productName={productName} inspectionAgencyName={inspectionAgencyName} />
          <TopTabs activeTab={activeTab} onChange={setActiveTab} />

          <div className="c-clear-left">
            <div className="tabs" style={{ fontSize: "12px" }}>
              <div id="tab1" className={`tab taba ${activeTab === "taba" ? "active" : ""}`}>
                <ProductInfoTab
                  consignorName={consignorName}
                  verificationDate={verificationDate}
                  conclusion={conclusion}
                />
              </div>

              <div id="tab2" className={`tab tabb ${activeTab === "tabb" ? "active" : ""}`}>
                <CompanyInfoTab onPreview={setPreviewImage} />
              </div>

              <div id="tab3" className={`tab tabc autoheigth ${activeTab === "tabc" ? "active" : ""}`}>
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
                  "此追溯码无效。可联系中检溯源服务热线0512-67998071咨询。"}
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
                {"下载该文件将产生"}
                <i className="c-font-normal" id="file-size"></i>
                {"的流量"}
              </span>
              <span className="c-pt-0">{"是否确认下载?"}</span>
            </div>
            <div className="ht50">
              <a
                id="file-download-btn"
                className="download-btn-frame"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                <span>{"确认"}</span>
              </a>
              <div id="file-cancal-btn" className="download-btn-frame">
                <span>{"取消"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
