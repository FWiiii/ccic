"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import { HeroImage } from "../HeroImage";
import { ImagePreviewModal } from "../ImagePreviewModal";
import { PageFooter } from "../PageFooter";
import { ProductCarousel } from "../ProductCarousel";
import { ProductSummary } from "../ProductSummary";
import { TopTabs, type TabKey } from "../TopTabs";
import { ProductInfoTab } from "../tabs/ProductInfoTab";
import { TraceInfoTab, type TraceStatus } from "../tabs/TraceInfoTab";

const CompanyInfoTab = dynamic(
  () => import("../tabs/CompanyInfoTab").then((module) => module.CompanyInfoTab),
  {
    loading: () => <div className="app-query-status">{"正在加载公司素材..."}</div>,
    ssr: false,
  }
);

export interface InspectionResultClientProps {
  bannerImages: string[];
  traceSampleImages: string[];
  productName: string;
  inspectionAgencyName: string;
  consignorName: string;
  verificationDate: string;
  conclusion?: string;
  currentTraceStatus: TraceStatus;
}

export function InspectionResultClient({
  bannerImages,
  traceSampleImages,
  productName,
  inspectionAgencyName,
  consignorName,
  verificationDate,
  conclusion,
  currentTraceStatus,
}: InspectionResultClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("taba");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <div className="page-group app-root">
      <div className="page page-current" id="xindex">
        <HeroImage />
        <PageFooter />

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
                {activeTab === "tabb" ? <CompanyInfoTab onPreview={setPreviewImage} /> : null}
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
                onClick={(event) => event.preventDefault()}
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
