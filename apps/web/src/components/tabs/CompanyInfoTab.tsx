import companyLogo from "../../assets/template/mu/static/picture/910612857824215040.jpg";
import companyImageA from "../../assets/template/mu/static/picture/1666591927040077430.png";
import companyImageB from "../../assets/template/mu/static/picture/1666591971967015074.jpg";
import companyImageC from "../../assets/template/mu/static/picture/1590048828117098165.jpg";
import companyImageD from "../../assets/template/mu/static/picture/1590048841611005669.jpg";
import companyImageE from "../../assets/template/mu/static/picture/1590048848871028263.jpg";

interface CompanyInfoTabProps {
  onPreview: (src: string) => void;
}

const descriptionStyle = {
  color: "rgb(15, 36, 62)",
  fontFamily: '微软雅黑, "Microsoft YaHei"',
} as const;

const richImageStyle = {
  maxWidth: "100%",
  height: "auto",
  display: "block",
  margin: "0 auto",
} as const;

export function CompanyInfoTab({ onPreview }: CompanyInfoTabProps) {
  return (
    <>
      <div className="tab2-div"></div>
      <div className="tab2-div2">
        <img
          className="tab2-img"
          id="logo"
          src={companyLogo}
          onClick={() => onPreview(companyLogo)}
          loading="lazy"
          decoding="async"
          alt=""
        />
        <span className="companyname tab2-span">中国检验认证集团奢侈品鉴定中心</span>

        <div className="hb-box" style={{ display: "none" }}>
          <div className="hz-info dz-box">
            <span className="hz-left">地址 : </span>
            <span className="dz"></span>
          </div>
          <div className="hz-info dh-box">
            <span className="hz-left">电话 : </span>
            <span className="dh">江苏省</span>
          </div>
          <div className="hz-info js-box">
            <span className="hz-left">介绍 : </span>
            <span className="js">江苏省</span>
          </div>
          <div className="hz-info xc-box">
            <span className="hz-left">宣传图片 : </span>
            <div className="hz-img xctp"></div>
          </div>
        </div>

        <span className="businessElectronicFile tab2-span2">
          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;中检集团奢侈品鉴定中心是中检集团设立的专门从事奢侈品鉴定与培训业务的“中国”字头第三方奢侈品鉴定平台，落地在中检北京公司。中检集团奢侈品鉴定中心致力以独立于买卖各方的身份，为社会各界提供公正、诚信的奢侈品鉴定及培训服务。
            </span>
          </p>
          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;中检集团奢侈品鉴定中心与中检集团溯源技术服务有限公司共同打造了中检奢侈品鉴定溯源防伪系统，向外界正式推出奢侈品鉴定溯源防伪服务。该系统应用“一品（物）一码”溯源专利防伪技术，通过扫一扫，就能随时了解奢侈品鉴定信息，真正做到鉴定溯源防伪一体化，为奢侈品市场保驾护航。经过鉴定溯源的奢侈品都会有中检中奢中心“鉴定溯源ID身份证”，“验明正身”的同时，提升消费体验，让消费者购物更放心。
            </span>
          </p>
          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;
              <span style={{ color: "rgb(227, 108, 9)", fontFamily: '微软雅黑, "Microsoft YaHei"' }}>
                <strong>联系电话：010-58619556&nbsp;</strong>
              </span>
            </span>
          </p>

          <p style={{ textAlign: "center" }}>
            <span style={descriptionStyle}>
              <img
                src={companyImageA}
                title="1666591927040077430.png"
                alt=""
                style={richImageStyle}
                onClick={() => onPreview(companyImageA)}
                loading="lazy"
                decoding="async"
              />
              <img
                src={companyImageB}
                title="1666591971967015074.jpg"
                alt=""
                style={richImageStyle}
                onClick={() => onPreview(companyImageB)}
                loading="lazy"
                decoding="async"
              />
            </span>
          </p>
          <p style={{ textAlign: "center" }}>
            <br />
          </p>
          <p>
            <span style={descriptionStyle}>
              <img
                src={companyImageC}
                title="1590048828117098165.jpg"
                alt=""
                style={richImageStyle}
                onClick={() => onPreview(companyImageC)}
                loading="lazy"
                decoding="async"
              />
            </span>
          </p>
          <p>
            <img
              src={companyImageD}
              title="1590048841611005669.jpg"
              alt=""
              style={richImageStyle}
              onClick={() => onPreview(companyImageD)}
              loading="lazy"
              decoding="async"
            />
            <img
              src={companyImageE}
              title="1590048848871028263.jpg"
              alt=""
              style={richImageStyle}
              onClick={() => onPreview(companyImageE)}
              loading="lazy"
              decoding="async"
            />
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
