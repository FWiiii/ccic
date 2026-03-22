import { useMemo, useState } from "react";
import dotIcon from "../../assets/template/mu/static/picture/dot1.jpg";
import recordIcon from "../../assets/template/mu/static/picture/1.jpg";

export type TraceStatus = "SUBMITTED" | "INSPECTING" | "COMPLETED";

type TraceSectionKey = "sample" | "conclusion" | "expert" | "statement";
type TraceSectionState = "finish" | "process" | "waiting";

interface TraceInfoTabProps {
  currentStatus: TraceStatus;
  recordDate: string;
  inspectionDepartment: string;
  conclusion?: string;
  sampleImages?: string[];
  onPreview?: (src: string) => void;
}

const DEFAULT_CONCLUSION = "送检样品符合品牌/制造商的技术信息或工艺特征";

const DECLARATION_TEXT = `一、本鉴定咨询意见是依据申请人提交的鉴定材料及送检样品，经检验鉴定后而得出的结论。如送检样品在鉴定结论给出后的状态发生变化，或奢侈品鉴定防伪扣与包身脱离，本鉴定咨询意见不再适用。
二、本鉴定咨询意见仅限在提供的鉴定材料及信息真实、准确、完整的基础上进行认定，除此以外产生的后果，由申请人或鉴定材料及送检样品的提供方承担。
三、本鉴定咨询意见结果，未经过我司书面同意，鉴定咨询意见书的全部或部分内容均不得见诸于任何公开媒体。
四、若对鉴定咨询意见存在异议，需由申请人在收到鉴定咨询意见后，向本司提交书面申请，逾期不予受理。
五、奢侈品鉴定防伪扣为送检样品不可分割之部分。奢侈品鉴定防伪扣若损毁或涂改均无法保证其有效性。如果申请人引用部分鉴定咨询意见的内容导致误解，或将此鉴定咨询意见的结论用于其他用途及由此造成的后果，我司概不负责。若对我司名誉造成侵害的，我司将依法追究其法律责任。
六、本鉴定咨询意见为非标项目，仅供申请人参考。本鉴定咨询意见不涉及样品品质检测。
七、针对恶意送假、知假送假和伪造我司奢侈品鉴定防伪扣的商家，我司将配合有关部门取样查证，如有违法行为，将依法追究其法律责任。
八、本次鉴定未有得到品牌所有人授权，仅为本司根据委托鉴定材料进行的技术咨询活动。
九、本鉴定咨询意见中涉及的所有信息及结论自签发之日起90日内有效，逾期自动失效，特殊情况可面议。`;

const SECTION_STATE_BY_TRACE_STATUS: Record<TraceStatus, TraceSectionState[]> = {
  SUBMITTED: ["process", "waiting", "waiting", "waiting"],
  INSPECTING: ["finish", "process", "waiting", "waiting"],
  COMPLETED: ["finish", "finish", "process", "waiting"],
};

const SECTION_TITLES: Array<{ key: TraceSectionKey; title: string }> = [
  { key: "sample", title: "样品信息" },
  { key: "conclusion", title: "鉴定结论" },
  { key: "expert", title: "鉴定专家" },
  { key: "statement", title: "中检申明" },
];

const defaultPanelState: Record<TraceSectionKey, boolean> = {
  sample: false,
  conclusion: false,
  expert: false,
  statement: false,
};

export function TraceInfoTab({
  currentStatus,
  recordDate,
  inspectionDepartment,
  conclusion,
  sampleImages,
  onPreview,
}: TraceInfoTabProps) {
  const [openPanels, setOpenPanels] = useState<Record<TraceSectionKey, boolean>>(defaultPanelState);

  const normalizedRecordDate = String(recordDate ?? "").trim();
  const recordTitle = normalizedRecordDate ? `${normalizedRecordDate}记录` : "记录";

  const normalizedSampleImages = useMemo(() => {
    const list = (sampleImages ?? []).map((item) => String(item ?? "").trim()).filter(Boolean);
    return list;
  }, [sampleImages]);

  const sectionStates = SECTION_STATE_BY_TRACE_STATUS[currentStatus] ?? SECTION_STATE_BY_TRACE_STATUS.SUBMITTED;

  const togglePanel = (key: TraceSectionKey) => {
    setOpenPanels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <ul className="tab3-ul app-trace-steps" id="ullist">
      <li style={{ width: "95%" }}>
        <div className="van-steps van-steps--vertical">
          <div className="van-steps__items">
            {SECTION_TITLES.map((section, index) => {
              const state = sectionStates[index] ?? "waiting";
              const isOpen = openPanels[section.key];

              return (
                <div
                  key={section.key}
                  className={`van-hairline van-step van-step--vertical van-step--${state}`}
                >
                  <div className={`van-step__title ${state === "process" ? "van-step__title--active" : ""}`}>
                    <div className="van-collapse">
                      <div className="van-collapse-item">
                        <button
                          type="button"
                          className="van-cell van-cell--clickable van-collapse-item__title"
                          onClick={() => togglePanel(section.key)}
                          aria-expanded={isOpen}
                        >
                          <div className="van-cell__title">
                            <span>{section.title}</span>
                          </div>
                          <i className="van-badge__wrapper van-icon van-icon-arrow van-cell__right-icon"></i>
                        </button>

                        <div className="van-collapse-item__wrapper" style={{ display: isOpen ? "block" : "none" }}>
                          <div className="van-collapse-item__content">
                            <div className="app-trace-record-header">
                              <img className="app-trace-record-icon" src={recordIcon.src} alt="" />
                              <span className="app-trace-record-title">
                                {section.key === "statement" ? "记录" : recordTitle}
                              </span>
                            </div>

                            <div className="app-trace-record-body">
                              {section.key === "sample" ? (
                                <div className="app-trace-body-center">
                                  {normalizedSampleImages.length > 0 ? (
                                    normalizedSampleImages.map((imageUrl, imageIndex) => (
                                      <img
                                        key={`${imageUrl}-${imageIndex}`}
                                        src={imageUrl}
                                        className="app-trace-sample-image"
                                        alt=""
                                        onClick={() => onPreview?.(imageUrl)}
                                      />
                                    ))
                                  ) : (
                                    <span style={{ color: "#999", fontSize: "14px" }}>暂无样品图</span>
                                  )}
                                </div>
                              ) : null}

                              {section.key === "conclusion" ? (
                                <div className="app-trace-row-wrap">
                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">鉴定部门：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">{inspectionDepartment || "-"}</span>
                                    </div>
                                  </div>

                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">鉴定日期：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">{normalizedRecordDate || "-"}</span>
                                    </div>
                                  </div>

                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">鉴定结论：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">{conclusion || DEFAULT_CONCLUSION}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {section.key === "expert" ? (
                                <div className="app-trace-row-wrap">
                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">鉴定意见Ⅰ：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">通过</span>
                                    </div>
                                  </div>

                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">鉴定意见Ⅱ：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">通过</span>
                                    </div>
                                  </div>

                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">鉴定专家意见Ⅲ：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">通过</span>
                                    </div>
                                  </div>

                                  <div className="app-trace-van-row">
                                    <div className="app-trace-van-col app-trace-van-col--8">
                                      <span className="app-trace-label">校对员：</span>
                                    </div>
                                    <div className="app-trace-van-col app-trace-van-col--16">
                                      <span className="app-trace-value">通过</span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {section.key === "statement" ? (
                                <div className="app-trace-statement-wrap">
                                  <p className="app-trace-statement">{DECLARATION_TEXT}</p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="van-step__circle-container">
                    <img className="app-trace-step-icon" src={dotIcon.src} alt="" />
                  </div>
                  <div className="van-step__line"></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="app-trace-bottom-space"></div>
      </li>
    </ul>
  );
}
