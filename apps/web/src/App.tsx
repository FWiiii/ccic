import { useEffect, useState } from "react";
import type { TracePageAggregate } from "@ccic/shared-types";
import { HeroImage } from "./components/HeroImage";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { PageFooter } from "./components/PageFooter";
import { ProductCarousel } from "./components/ProductCarousel";
import { ProductSummary } from "./components/ProductSummary";
import { TopTabs, type TabKey } from "./components/TopTabs";
import { CompanyInfoTab } from "./components/tabs/CompanyInfoTab";
import { ProductInfoTab } from "./components/tabs/ProductInfoTab";
import { TraceInfoTab } from "./components/tabs/TraceInfoTab";

const DEFAULT_TRACE_CODE = "CCIC-DEMO-0001";

function getTraceCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("code")?.trim() || DEFAULT_TRACE_CODE;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("taba");
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [traceCode] = useState(getTraceCodeFromUrl);
  const [aggregate, setAggregate] = useState<TracePageAggregate | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [hideErrorDialog, setHideErrorDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTraceData() {
      try {
        const response = await fetch(`/api/public/traces/${encodeURIComponent(traceCode)}`);
        const payload = (await response.json()) as { data?: TracePageAggregate; message?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.message || "追溯码无效");
        }

        if (cancelled) {
          return;
        }

        setAggregate(payload.data);
        setRequestError(null);
        setHideErrorDialog(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAggregate(null);
        setRequestError(error instanceof Error ? error.message : "追溯码无效");
        setHideErrorDialog(false);
      }
    }

    void loadTraceData();

    return () => {
      cancelled = true;
    };
  }, [traceCode]);

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <HeroImage src={aggregate?.heroImage?.url} />
        <PageFooter />

        <div className="content contentDivOne native-scroll" style={{ paddingTop: 0 }}>
          <ProductCarousel images={aggregate?.carouselImages} onPreview={setPreviewImage} />
          <ProductSummary
            productName={aggregate?.product.name}
            companyName={aggregate?.company.name}
          />
          <TopTabs activeTab={activeTab} onChange={setActiveTab} />

          <div className="c-clear-left">
            <div className="tabs" style={{ fontSize: "12px" }}>
              <div id="tab1" className={`tab taba ${activeTab === "taba" ? "active" : ""}`}>
                <ProductInfoTab
                  productInfoHtml={aggregate?.product.productInfoHtml}
                  consignorName={aggregate?.inspectionReport?.consignorName}
                  inspectionDate={aggregate?.inspectionReport?.inspectionDate}
                  conclusion={aggregate?.inspectionReport?.conclusion}
                  notes={aggregate?.inspectionReport?.notes}
                  rawHtml={aggregate?.inspectionReport?.rawHtml}
                />
              </div>

              <div id="tab2" className={`tab tabb ${activeTab === "tabb" ? "active" : ""}`}>
                <CompanyInfoTab
                  onPreview={setPreviewImage}
                  companyName={aggregate?.company.name}
                  companyPhone={aggregate?.company.phone}
                  descriptionHtml={aggregate?.company.descriptionHtml}
                  logoSrc={aggregate?.companyLogo?.url}
                  images={aggregate?.companyDetailImages}
                />
              </div>

              <div
                id="tab3"
                className={`tab tabc autoheigth ${activeTab === "tabc" ? "active" : ""}`}
              >
                <TraceInfoTab
                  expanded={expanded}
                  onToggle={() => setExpanded((value) => !value)}
                  events={aggregate?.traceEvents}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          id="codeunsetshow"
          className="unsetshowdiv"
          style={{ display: requestError && !hideErrorDialog ? "block" : "none" }}
        >
          <div className="unsetshowdoublediv">
            <div className="unsetshowthreediv">
              <span>{requestError || "追溯码无效，请联系服务方。"}</span>
            </div>
            <div className="ht50">
              <div
                id="enterccic"
                className="unsetshowfourdiv"
                onClick={() => setHideErrorDialog(true)}
              >
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>

        <div id="download-files-dialog" className="unsetshowdiv">
          <div className="unsetshowdoublediv">
            <div className="unsetshowthreediv">
              <span>
                涓嬭浇璇ユ枃浠跺皢浜х敓<i className="c-font-normal" id="file-size"></i>鐨勬祦閲?
              </span>
              <span className="c-pt-0">鏄惁纭涓嬭浇?</span>
            </div>
            <div className="ht50">
              <a id="file-download-btn" className="download-btn-frame" href="#" onClick={(e) => e.preventDefault()}>
                <span>纭</span>
              </a>
              <div id="file-cancal-btn" className="download-btn-frame">
                <span>鍙栨秷</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
