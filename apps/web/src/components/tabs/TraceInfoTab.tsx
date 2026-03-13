import type { TraceEvent } from "@ccic/shared-types";
import dotIcon from "../../assets/template/mu/static/picture/dot1.jpg";
import recordIcon from "../../assets/template/mu/static/picture/1.jpg";
import toggleIcon from "../../assets/template/mu/static/picture/data3.jpg";

interface TraceInfoTabProps {
  expanded: boolean;
  onToggle: () => void;
  events?: TraceEvent[];
}

const fallbackEvent: TraceEvent = {
  id: "fallback",
  traceCodeId: "fallback",
  eventTime: "2026-01-30T00:00:00.000Z",
  eventType: "INSPECTION",
  title: "委托单位简介",
  content: "港城国际",
  sortOrder: 0,
  createdAt: "2026-01-30T00:00:00.000Z",
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}记录`;
}

export function TraceInfoTab({ expanded, onToggle, events }: TraceInfoTabProps) {
  const list = events && events.length > 0 ? events : [fallbackEvent];

  return (
    <ul className="tab3-ul" id="ullist">
      {list.map((event, index) => (
        <li style={{ width: "95%" }} key={event.id}>
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
            <span style={{ fontWeight: "bold", color: "#000", fontSize: "0.7rem" }}>濮旀墭鍗曚綅绠€浠?</span>
            <div style={{ float: "right" }}>
              <span
                className="Icons"
                style={{ color: "#666", fontWeight: "bold", paddingRight: "8px", fontSize: "0.7rem" }}
              >
                {expanded ? "鏀惰捣" : "灞曞紑"}
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
                {" "}
                {formatDateLabel(event.eventTime)}
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
                id={index === 0 ? "ccc" : undefined}
              >
                <span style={{ color: "#333", fontWeight: "bold", display: "block", fontSize: "0.6rem" }}>
                  {event.title}: <span id={index === 0 ? "vvv" : undefined}>{event.content || event.eventType}</span>
                </span>
              </label>

              <div style={{ marginBottom: "10px" }}></div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
