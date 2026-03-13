import dotIcon from "../../assets/template/mu/static/picture/dot1.jpg";
import recordIcon from "../../assets/template/mu/static/picture/1.jpg";
import toggleIcon from "../../assets/template/mu/static/picture/data3.jpg";

interface TraceInfoTabProps {
  expanded: boolean;
  onToggle: () => void;
}

export function TraceInfoTab({ expanded, onToggle }: TraceInfoTabProps) {
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
          <span style={{ fontWeight: "bold", color: "#000", fontSize: "0.7rem" }}>委托单位简介</span>
          <div style={{ float: "right" }}>
            <span
              className="Icons"
              style={{ color: "#666", fontWeight: "bold", paddingRight: "8px", fontSize: "0.7rem" }}
            >
              {expanded ? "收起" : "展开"}
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
              {" "}2026-1-30记录
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
                委托单位简介: <span id="vvv">港城国际</span>
              </span>
            </label>

            <div style={{ marginBottom: "10px" }}></div>
          </div>
        </div>
      </li>
    </ul>
  );
}
