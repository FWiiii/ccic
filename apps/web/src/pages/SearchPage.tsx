import { useMemo, useState } from "react";
import "../styles/search-authen.css";
import logoImage from "../assets/template/mu/static/picture/logo.jpg";
import falseImage from "../assets/template/mu/static/picture/infobg-false.jpg";
import okImage from "../assets/template/mu/static/picture/infobg-ture.jpg";
import warnImage from "../assets/template/mu/static/picture/infobg-warn.jpg";

type SearchResultState = "idle" | "ok" | "fail";

const readCodeFromUrl = () => new URLSearchParams(window.location.search).get("code")?.trim() ?? "";

export function SearchPage() {
  const expectedCode = useMemo(() => readCodeFromUrl(), []);
  const [searchCode, setSearchCode] = useState("");
  const [resultState, setResultState] = useState<SearchResultState>("idle");

  const traceCode = searchCode.trim() || expectedCode || "-";
  const isIdle = resultState === "idle";
  const isOk = resultState === "ok";
  const isFail = resultState === "fail";

  const handleSearch = () => {
    const input = searchCode.trim();

    if (!input) {
      window.alert("\u9632\u4f2a\u7801\u5fc5\u586b");
      return;
    }

    if (expectedCode && input !== expectedCode) {
      setResultState("fail");
      return;
    }

    setResultState("ok");
  };

  return (
    <div className="page-group">
      <div className="page page-current" id="search-page">
        <div className="content search-div" style={{ top: "0.8rem", position: "relative", zIndex: 10 }}>
          <img className="authen-comp-logo" src={logoImage} alt="logo" />
          <div className="authen-content-frame">
            <div className="auth-search-item">
              <input
                className="auth-search-txt"
                required
                type="text"
                value={searchCode}
                onChange={(event) => setSearchCode(event.target.value)}
              />
              <input className="auth-search-btn" type="button" value={"\u67e5\u8be2"} onClick={handleSearch} />
            </div>

            <div className="auth-tips-item">
              <p className="auth-tips">
                {"\u5982\u4f55\u83b7\u53d6\u9632\u4f2a\u7f16\u7801\uff1a\u60a8\u53ef\u4ee5\u5728\u5546\u54c1\u5916\u5305\u88c5\u4e0a\u627e\u5230\u9632\u4f2a\u8d34\u7eb8\uff0c\u522e\u5f00\u6d82\u5c42\uff0c\u83b7\u5f974\u4f4d\u9632\u4f2a\u7f16\u7801\u3002"}
              </p>
            </div>

            <div className="auth-msg-item">
              <p className={`auth-search-result ${isIdle ? "c-none" : ""}`} style={{ display: isIdle ? "none" : "block" }}>
                {"\u67e5\u8be2\u7ed3\u679c"}
              </p>

              <div className="auth-result-frame">
                <img className="c-w100p auth-img-false c-none" src={falseImage} alt="false" style={{ display: "none" }} />
                <img
                  className={`c-w100p auth-img-ok ${isOk ? "" : "c-none"}`}
                  src={okImage}
                  alt="ok"
                  style={{ display: isOk ? "block" : "none" }}
                />
                <img
                  className={`c-w100p auth-img-warn ${isFail ? "" : "c-none"}`}
                  src={warnImage}
                  alt="warn"
                  style={{ display: isFail ? "block" : "none" }}
                />

                <span
                  className={`auth-result-fail ${isFail ? "" : "c-none"}`}
                  style={{ display: isFail ? "block" : "none" }}
                >
                  {"\u6b64\u6b21\u67e5\u8be2\u65e0\u6548 \u8bf7\u4ed4\u7ec6\u6838\u5bf94\u4f4d\u9632\u4f2a\u7f16\u7801\u8f93\u5165\u662f\u5426\u6b63\u786e"}
                </span>

                <span
                  className={`auth-result-ok ${isOk ? "" : "c-none"}`}
                  style={{ display: isOk ? "block" : "none" }}
                >
                  {"\u67e5\u8be2\u6709\u6548\uff0c\u9a8c\u8bc1\u6210\u529f"}
                </span>

                <span className="auth-result-warn c-none" style={{ display: "none", top: "0.7rem" }}>
                  {"\u67e5\u8be2\u6709\u6548\uff0c\u9a8c\u8bc1\u6210\u529f"}
                </span>
              </div>
            </div>

            <div className={`auth-info-item ${isOk ? "" : "c-none"}`} style={{ display: isOk ? "block" : "none" }}>
              <p className="auth-info-num c-none" style={{ display: "block" }}>
                {"\u6eaf\u6e90\u53f7\u7801\uff1a"}
                <span className="auth-serinum">{traceCode}</span>
              </p>
              <p className="auth-product-name c-none" style={{ display: "block" }}>
                {"\u4ea7\u54c1\u540d\u79f0\uff1a"}
                <span className="auth-pro-name">{" \u6807\u793a\u54c1\u724c\uff1a\u9f99\u9aa7  \u624b\u888b 23-0419-117"}</span>
              </p>
              <p className="auth-comp-name c-none" style={{ display: "block" }}>
                {"\u4f01\u4e1a\u540d\u79f0\uff1a"}
                <span className="auth-com-name">{"\u4e2d\u56fd\u68c0\u9a8c\u8ba4\u8bc1\u96c6\u56e2\u4e0a\u6d77\u6709\u9650\u516c\u53f8\uff08\u5962\u4f88\u54c1\u9274\u5b9a\uff09"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="auth-contact-item">
          <p className="c-mrg-0">
            {"\u5982\u9700\u54a8\u8be2\uff0c\u8bf7\u62e8\u6253\u00a0"}
            <a className="auth-contact-phone dh">{" 01058619556(\u8d2d\u4e703\u65e5\u672a\u6fc0\u6d3b)\u5ba2\u670d\u65f6\u95f4: \u5de5\u4f5c\u65e5 9:00~12:00/13:30-17:30"}</a>
          </p>
          <p className="c-mrg-0">{"\uff08\u5de5\u4f5c\u65e5\u65f6\u95f4 09:00 - 16:30\uff09"}</p>
          <div className="auth-qrcode-frame c-none" style={{ marginTop: "10px", display: "none" }}>
            <span className="auth-qrcode-des">{"\u626b\u7801\u83b7\u53d6\u66f4\u591a\u5e2e\u52a9"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}