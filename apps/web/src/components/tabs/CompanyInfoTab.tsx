import type { MediaAsset } from "@ccic/shared-types";
import companyLogo from "../../assets/template/mu/static/picture/910612857824215040.jpg";
import companyImageA from "../../assets/template/mu/static/picture/1666591927040077430.png";
import companyImageB from "../../assets/template/mu/static/picture/1666591971967015074.jpg";
import companyImageC from "../../assets/template/mu/static/picture/1590048828117098165.jpg";
import companyImageD from "../../assets/template/mu/static/picture/1590048841611005669.jpg";
import companyImageE from "../../assets/template/mu/static/picture/1590048848871028263.jpg";

interface CompanyInfoTabProps {
  onPreview: (src: string) => void;
  companyName?: string;
  companyPhone?: string;
  descriptionHtml?: string;
  logoSrc?: string;
  images?: MediaAsset[];
}

const descriptionStyle = {
  color: "rgb(15, 36, 62)",
  fontFamily: '寰蒋闆呴粦, "Microsoft YaHei"',
} as const;

const richImageStyle = {
  maxWidth: "100%",
  height: "auto",
  display: "block",
  margin: "0 auto",
} as const;

const fallbackDescription = [
  "中检集团奢侈品鉴定中心是中检集团设立的第三方奢侈品鉴定与培训服务平台。",
  "系统应用一物一码追溯技术，支持扫码核验，帮助用户快速识别商品鉴定信息。",
];

const fallbackImages = [companyImageA, companyImageB, companyImageC, companyImageD, companyImageE];

export function CompanyInfoTab({
  onPreview,
  companyName,
  companyPhone,
  descriptionHtml,
  logoSrc,
  images,
}: CompanyInfoTabProps) {
  const displayLogo = logoSrc || companyLogo;
  const imageUrls = images && images.length > 0 ? images.map((item) => item.url) : fallbackImages;
  const firstRow = imageUrls.slice(0, 2);
  const secondRow = imageUrls.slice(2, 3);
  const thirdRow = imageUrls.slice(3);

  return (
    <>
      <div className="tab2-div"></div>
      <div className="tab2-div2">
        <img className="tab2-img" id="logo" src={displayLogo} onClick={() => onPreview(displayLogo)} alt="" />
        <span className="companyname tab2-span">
          {companyName || "涓浗妫€楠岃璇侀泦鍥㈠ア渚堝搧閴村畾涓績"}
        </span>

        <div className="hb-box" style={{ display: "none" }}>
          <div className="hz-info dz-box">
            <span className="hz-left">鍦板潃 : </span>
            <span className="dz"></span>
          </div>
          <div className="hz-info dh-box">
            <span className="hz-left">鐢佃瘽 : </span>
            <span className="dh">姹熻嫃鐪?</span>
          </div>
          <div className="hz-info js-box">
            <span className="hz-left">浠嬬粛 : </span>
            <span className="js">姹熻嫃鐪?</span>
          </div>
          <div className="hz-info xc-box">
            <span className="hz-left">瀹ｄ紶鍥剧墖 : </span>
            <div className="hz-img xctp"></div>
          </div>
        </div>

        <span className="businessElectronicFile tab2-span2">
          {descriptionHtml ? (
            <div style={descriptionStyle} dangerouslySetInnerHTML={{ __html: descriptionHtml }}></div>
          ) : (
            fallbackDescription.map((text) => (
              <p key={text}>
                <span style={descriptionStyle}>
                  &nbsp; &nbsp; &nbsp; &nbsp;{text}
                </span>
              </p>
            ))
          )}

          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;
              <span style={{ color: "rgb(227, 108, 9)", fontFamily: '寰蒋闆呴粦, "Microsoft YaHei"' }}>
                <strong>联系电话：{companyPhone || "010-58619556"}&nbsp;</strong>
              </span>
            </span>
          </p>

          <p style={{ textAlign: "center" }}>
            <span style={descriptionStyle}>
              {firstRow.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  style={richImageStyle}
                  onClick={() => onPreview(src)}
                />
              ))}
            </span>
          </p>
          <p style={{ textAlign: "center" }}>
            <br />
          </p>
          <p>
            <span style={descriptionStyle}>
              {secondRow.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  style={richImageStyle}
                  onClick={() => onPreview(src)}
                />
              ))}
            </span>
          </p>
          <p>
            {thirdRow.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                style={richImageStyle}
                onClick={() => onPreview(src)}
              />
            ))}
          </p>
          <p>
            <br />
          </p>
          <p>
            <br />
          </p>
        </span>

        <div className="bot"></div>
      </div>

      <div className="tab2-div3">
        <span className="tab2-span3"></span>
      </div>

      <div className="tab2-div4" id="imgcontend" style={{ textAlign: "center" }}>
        <div></div>
      </div>
    </>
  );
}
