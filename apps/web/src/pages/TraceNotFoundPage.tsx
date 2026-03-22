import "../styles/trace-notfound.css";
import qrcodeImage from "../assets/template/mu/static/picture/qrcode-trace.jpg";

interface TraceNotFoundPageProps {
  traceCode: string;
  serviceProvider: string;
}

export function TraceNotFoundPage({ traceCode, serviceProvider }: TraceNotFoundPageProps) {
  const normalizedTraceCode = String(traceCode ?? "").trim() || "-";
  const normalizedProvider = String(serviceProvider ?? "").trim() || "-";

  return (
    <div className="page-group trace-notfound-page indexBody" style={{ backgroundColor: "white" }}>
      <div className="page page-current" id="xindex">
        <header className="bar bar-nav tit"></header>

        <div className="content contentDivOne">
          <div className="center">
            <div className="title">{"查询结果"}</div>

            <div className="ts">
              <span style={{ paddingRight: "0.2rem" }}>{"追溯码"}</span>
              <span id="traceCode" className="err">
                {normalizedTraceCode}
              </span>
            </div>

            <div className="zt" style={{ display: "block" }}>
              <span className="states">{"该追溯码没有激活"}</span>
              {"，"}
              <span className="prompt">{"追溯码属于"}</span>
              <span className="serviceProvider">{normalizedProvider}</span>
            </div>

            <div className="not" style={{ display: "none" }}></div>

            <div className="bottom">
              {"建议拨打"}
              <span className="dh">
                {"01058619556(购买3日未激活)客服时间：工作日9:00~12:00/13:30-17:30"}
              </span>
              {"让客服帮助你"}
            </div>

            <div className="auth-qrcode-frame" style={{ marginTop: "0.8rem" }}>
              <img className="auth-qrcode-img" src={qrcodeImage.src} alt="qrcode" />
              <span className="auth-qrcode-des">{"扫码获取更多帮助"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
