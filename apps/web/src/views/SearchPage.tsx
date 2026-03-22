import { useMemo, useState } from "react";
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
      window.alert("防伪码必填");
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
          <img className="authen-comp-logo" src={logoImage.src} alt="logo" />
          <div className="authen-content-frame">
            <div className="auth-search-item">
              <input
                className="auth-search-txt"
                required
                type="text"
                value={searchCode}
                onChange={(event) => setSearchCode(event.target.value)}
              />
              <input className="auth-search-btn" type="button" value={"查询"} onClick={handleSearch} />
            </div>

            <div className="auth-tips-item">
              <p className="auth-tips">
                {"如何获取防伪编码：您可以在商品外包装上找到防伪贴纸，刮开涂层，获得4位防伪编码。"}
              </p>
            </div>

            <div className="auth-msg-item">
              <p className={`auth-search-result ${isIdle ? "c-none" : ""}`} style={{ display: isIdle ? "none" : "block" }}>
                {"查询结果"}
              </p>

              <div className="auth-result-frame">
                <img
                  className="c-w100p auth-img-false c-none"
                  src={falseImage.src}
                  alt="false"
                  style={{ display: "none" }}
                />
                <img
                  className={`c-w100p auth-img-ok ${isOk ? "" : "c-none"}`}
                  src={okImage.src}
                  alt="ok"
                  style={{ display: isOk ? "block" : "none" }}
                />
                <img
                  className={`c-w100p auth-img-warn ${isFail ? "" : "c-none"}`}
                  src={warnImage.src}
                  alt="warn"
                  style={{ display: isFail ? "block" : "none" }}
                />

                <span
                  className={`auth-result-fail ${isFail ? "" : "c-none"}`}
                  style={{ display: isFail ? "block" : "none" }}
                >
                  {"此次查询无效 请仔细核对4位防伪编码输入是否正确"}
                </span>

                <span
                  className={`auth-result-ok ${isOk ? "" : "c-none"}`}
                  style={{ display: isOk ? "block" : "none" }}
                >
                  {"查询有效，验证成功"}
                </span>

                <span className="auth-result-warn c-none" style={{ display: "none", top: "0.7rem" }}>
                  {"查询有效，验证成功"}
                </span>
              </div>
            </div>

            <div className={`auth-info-item ${isOk ? "" : "c-none"}`} style={{ display: isOk ? "block" : "none" }}>
              <p className="auth-info-num c-none" style={{ display: "block" }}>
                {"溯源号码："}
                <span className="auth-serinum">{traceCode}</span>
              </p>
              <p className="auth-product-name c-none" style={{ display: "block" }}>
                {"产品名称："}
                <span className="auth-pro-name">{" 标示品牌：龙骧  手袋 23-0419-117"}</span>
              </p>
              <p className="auth-comp-name c-none" style={{ display: "block" }}>
                {"企业名称："}
                <span className="auth-com-name">{"中国检验认证集团上海有限公司（奢侈品鉴定）"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="auth-contact-item">
          <p className="c-mrg-0">
            {"如需咨询，请拨打 "}
            <a className="auth-contact-phone dh">{" 01058619556(购买3日未激活)客服时间: 工作日 9:00~12:00/13:30-17:30"}</a>
          </p>
          <p className="c-mrg-0">{"（工作日时间 09:00 - 16:30）"}</p>
          <div className="auth-qrcode-frame c-none" style={{ marginTop: "10px", display: "none" }}>
            <span className="auth-qrcode-des">{"扫码获取更多帮助"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
