import { useState } from "react";
import { HeroImage } from "./components/HeroImage";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { PageFooter } from "./components/PageFooter";
import { ProductCarousel } from "./components/ProductCarousel";
import { ProductSummary } from "./components/ProductSummary";
import { TopTabs, type TabKey } from "./components/TopTabs";
import { CompanyInfoTab } from "./components/tabs/CompanyInfoTab";
import { ProductInfoTab } from "./components/tabs/ProductInfoTab";
import { TraceInfoTab } from "./components/tabs/TraceInfoTab";
import { useInspectionDisplayModel } from "./hooks/useInspectionDisplayModel";
import { useInspectionQuery } from "./hooks/useInspectionQuery";
import { useRouteType } from "./hooks/useRouteType";
import { FeedbackPage } from "./pages/FeedbackPage";
import { SearchPage } from "./pages/SearchPage";
import { TraceNotFoundPage } from "./pages/TraceNotFoundPage";

const INSPECTION_AGENCY_FALLBACK =
  "中国检验认证集团奢侈品鉴定中心";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("taba");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { querySn, isSearchPage, isFeedbackPage } = useRouteType();

  const { inspectionData, isLoading, errorMessage, showTraceNotFoundPage } = useInspectionQuery({
    querySn,
    isSearchPage,
    isFeedbackPage,
  });

  const {
    bannerImages,
    traceSampleImages,
    productName,
    inspectionAgencyName,
    consignorName,
    verificationDate,
    conclusion,
    currentTraceStatus,
  } = useInspectionDisplayModel({
    inspectionData,
    inspectionAgencyFallback: INSPECTION_AGENCY_FALLBACK,
  });

  if (isSearchPage) {
    return <SearchPage />;
  }

  if (isFeedbackPage) {
    return <FeedbackPage />;
  }

  if (showTraceNotFoundPage) {
    return <TraceNotFoundPage traceCode={querySn} serviceProvider={INSPECTION_AGENCY_FALLBACK} />;
  }

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <HeroImage />
        <PageFooter />

        {isLoading ? (
          <div className="app-query-status">
            {"正在根据 SN 查询鉴定结果..."}
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