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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("taba");
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <HeroImage />
        <PageFooter />

        <div className="content contentDivOne native-scroll" style={{ paddingTop: 0 }}>
          <ProductCarousel onPreview={setPreviewImage} />
          <ProductSummary />
          <TopTabs activeTab={activeTab} onChange={setActiveTab} />

          <div className="c-clear-left">
            <div className="tabs" style={{ fontSize: "12px" }}>
              <div id="tab1" className={`tab taba ${activeTab === "taba" ? "active" : ""}`}>
                <ProductInfoTab />
              </div>

              <div id="tab2" className={`tab tabb ${activeTab === "tabb" ? "active" : ""}`}>
                <CompanyInfoTab onPreview={setPreviewImage} />
              </div>

              <div
                id="tab3"
                className={`tab tabc autoheigth ${activeTab === "tabc" ? "active" : ""}`}
              >
                <TraceInfoTab expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
              </div>
            </div>
          </div>
        </div>

        <div id="codeunsetshow" className="unsetshowdiv">
          <div className="unsetshowdoublediv">
            <div className="unsetshowthreediv">
              <span>此追溯码无效。可联系中检溯源服务热线0512-67998071咨询。</span>
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
                下载该文件将产生<i className="c-font-normal" id="file-size"></i>的流量
              </span>
              <span className="c-pt-0">是否确认下载?</span>
            </div>
            <div className="ht50">
              <a id="file-download-btn" className="download-btn-frame" href="#" onClick={(e) => e.preventDefault()}>
                <span>确认</span>
              </a>
              <div id="file-cancal-btn" className="download-btn-frame">
                <span>取消</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
