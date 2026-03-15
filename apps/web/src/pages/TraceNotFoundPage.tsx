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
            <div className="title">{"\u67e5\u8be2\u7ed3\u679c"}</div>

            <div className="ts">
              <span style={{ paddingRight: "0.2rem" }}>{"\u8ffd\u6eaf\u7801"}</span>
              <span id="traceCode" className="err">
                {normalizedTraceCode}
              </span>
            </div>

            <div className="zt" style={{ display: "block" }}>
              <span className="states">{"\u8be5\u8ffd\u6eaf\u7801\u6ca1\u6709\u6fc0\u6d3b"}</span>
              {"\uff0c"}
              <span className="prompt">{"\u8ffd\u6eaf\u7801\u5c5e\u4e8e"}</span>
              <span className="serviceProvider">{normalizedProvider}</span>
            </div>

            <div className="not" style={{ display: "none" }}></div>

            <div className="bottom">
              {"\u5efa\u8bae\u62e8\u6253"}
              <span className="dh">
                {"01058619556(\u8d2d\u4e703\u65e5\u672a\u6fc0\u6d3b)\u5ba2\u670d\u65f6\u95f4\uff1a\u5de5\u4f5c\u65e59:00~12:00/13:30-17:30"}
              </span>
              {"\u8ba9\u5ba2\u670d\u5e2e\u52a9\u4f60"}
            </div>

            <div className="auth-qrcode-frame" style={{ marginTop: "0.8rem" }}>
              <img className="auth-qrcode-img" src={qrcodeImage} alt="qrcode" />
              <span className="auth-qrcode-des">{"\u626b\u7801\u83b7\u53d6\u66f4\u591a\u5e2e\u52a9"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}