import { Suspense, lazy, useState } from "react";
import { HeroImage } from "./components/HeroImage";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { PageFooter } from "./components/PageFooter";
import { ProductCarousel } from "./components/ProductCarousel";
import { ProductSummary } from "./components/ProductSummary";
import { TopTabs, type TabKey } from "./components/TopTabs";
import { ProductInfoTab } from "./components/tabs/ProductInfoTab";
import { TraceInfoTab } from "./components/tabs/TraceInfoTab";
import { useInspectionDisplayModel } from "./hooks/useInspectionDisplayModel";
import { useInspectionQuery } from "./hooks/useInspectionQuery";
import { useRouteType } from "./hooks/useRouteType";
import { FeedbackPage } from "./pages/FeedbackPage";
import { SearchPage } from "./pages/SearchPage";
import { TraceNotFoundPage } from "./pages/TraceNotFoundPage";

const INSPECTION_AGENCY_FALLBACK =
  "\u4e2d\u56fd\u68c0\u9a8c\u8ba4\u8bc1\u96c6\u56e2\u5962\u4f88\u54c1\u9274\u5b9a\u4e2d\u5fc3";

const CompanyInfoTab = lazy(() =>
  import("./components/tabs/CompanyInfoTab").then((module) => ({ default: module.CompanyInfoTab }))
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("taba");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { querySn, isSearchPage, isFeedbackPage } = useRouteType();

  const { inspectionData, status, errorMessage } = useInspectionQuery({
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

  if (status === "not_found") {
    return <TraceNotFoundPage traceCode={querySn} serviceProvider={INSPECTION_AGENCY_FALLBACK} />;
  }

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <HeroImage />
        <PageFooter />

        {status === "loading" ? (
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
                {activeTab === "tabb" ? (
                  <Suspense fallback={<div className="app-query-status">{"\u6b63\u5728\u52a0\u8f7d\u516c\u53f8\u7d20\u6750..."}</div>}>
                    <CompanyInfoTab onPreview={setPreviewImage} />
                  </Suspense>
                ) : null}
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
