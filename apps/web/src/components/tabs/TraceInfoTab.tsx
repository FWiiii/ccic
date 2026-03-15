import dotIcon from "../../assets/template/mu/static/picture/dot1.jpg";
import recordIcon from "../../assets/template/mu/static/picture/1.jpg";
import toggleIcon from "../../assets/template/mu/static/picture/data3.jpg";

export type TraceStatus = "SUBMITTED" | "INSPECTING" | "COMPLETED";

export interface TraceStep {
  status: TraceStatus;
  label: string;
  reached: boolean;
}

interface TraceInfoTabProps {
  expanded: boolean;
  onToggle: () => void;
  currentStatus: TraceStatus;
  steps: TraceStep[];
  recordDate: string;
  consignorName: string;
}

const statusLabelMap: Record<TraceStatus, string> = {
  SUBMITTED: "\u5df2\u9001\u68c0",
  INSPECTING: "\u68c0\u6d4b\u4e2d",
  COMPLETED: "\u5df2\u68c0\u6d4b",
};

export function TraceInfoTab({
  expanded,
  onToggle,
  currentStatus,
  steps,
  recordDate,
  consignorName,
}: TraceInfoTabProps) {
  return (
    <ul className="tab3-ul" id="ullist">
      <li style={{ width: "95%" }}>
        <img
          src={dotIcon}
          style={{ position: "absolute", left: "15px", width: "21px", height: "21px" }}
          width="28"
          height="28"
          alt=""
        />
        <div style={{ float: "left" }}></div>
        <div
          className="showIcons"
          style={{ padding: "14px", paddingLeft: "8px", paddingTop: 0, marginTop: "14px" }}
          onClick={onToggle}
        >
          <span style={{ fontWeight: "bold", color: "#000", fontSize: "0.7rem" }}>
            {`\u8ffd\u6eaf\u72b6\u6001\uff08\u5f53\u524d\uff1a${statusLabelMap[currentStatus]}\uff09`}
          </span>
          <div style={{ float: "right" }}>
            <span
              className="Icons"
              style={{ color: "#666", fontWeight: "bold", paddingRight: "8px", fontSize: "0.7rem" }}
            >
              {expanded ? "\u6536\u8d77" : "\u5c55\u5f00"}
            </span>
            <img
              className="showIcon"
              style={{
                display: "block",
                float: "right",
                paddingTop: expanded ? "6%" : "12%",
                paddingBottom: expanded ? "9%" : "8%",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
              src={toggleIcon}
              alt=""
            />
          </div>
        </div>
        <div style={{ borderBottom: "1px solid #bfbfbf", height: "1px" }}></div>

        <div
          style={{
            margin: "10px 0.1rem 0.1rem",
            borderRadius: "10px",
            overflow: "hidden",
            display: expanded ? "block" : "none",
          }}
          className="showWrap"
        >
          <div
            style={{
              height: "32px",
              borderRadius: "10px 10px 0px 0px",
              backgroundColor: "#005bac",
              border: "1px solid #005bac",
            }}
          >
            <img
              src={recordIcon}
              style={{ height: "100%", padding: "5px", paddingLeft: "13px", float: "left" }}
              alt=""
            />
            <span
              style={{
                display: "block",
                float: "left",
                color: "white",
                fontWeight: "bold",
                lineHeight: "32px",
                paddingLeft: "12px",
                fontSize: "0.6rem",
              }}
            >
              {recordDate || "--"}
              {"\u8bb0\u5f55"}
            </span>
          </div>
          <div
            style={{
              borderRadius: "0px 0px 10px 10px",
              borderBottom: "1px solid #bfbfbf",
              borderLeft: "1px solid #bfbfbf",
              borderRight: "1px solid #bfbfbf",
            }}
          >
            <div></div>
            <label
              style={{ display: "block", paddingTop: "5px", paddingLeft: "10px", paddingRight: "10px" }}
              id="ccc"
            >
              <span style={{ color: "#333", fontWeight: "bold", display: "block", fontSize: "0.6rem" }}>
                {"\u59d4\u6258\u5355\u4f4d: "}
                <span id="vvv">{consignorName || "-"}</span>
              </span>
            </label>

            {steps.map((item) => (
              <div className="traceInfo" key={item.status}>
                <span className="traceInfo-tit">{item.label}</span>
                <p className="traceInfo-dls">{item.reached ? "\u5df2\u5b8c\u6210" : "\u5f85\u5904\u7406"}</p>
              </div>
            ))}

            <div style={{ marginBottom: "10px" }}></div>
          </div>
        </div>
      </li>
    </ul>
  );
}
