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
  fontFamily: '寰蒋闆呴粦, "Microsoft YaHei"',
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
        <img className="tab2-img" id="logo" src={companyLogo} onClick={() => onPreview(companyLogo)} alt="" />
        <span className="companyname tab2-span">涓浗妫€楠岃璇侀泦鍥㈠ア渚堝搧閴村畾涓績</span>

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
          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;涓闆嗗洟濂緢鍝侀壌瀹氫腑蹇冩槸涓闆嗗洟璁剧珛鐨勪笓闂ㄤ粠浜嬪ア渚堝搧閴村畾涓庡煿璁笟鍔＄殑鈥滀腑鍥解€濆瓧澶寸涓夋柟濂緢鍝侀壌瀹氬钩鍙帮紝钀藉湴鍦ㄤ腑妫€鍖椾含鍏徃銆備腑妫€闆嗗洟濂緢鍝侀壌瀹氫腑蹇冭嚧鍔涗互鐙珛浜庝拱鍗栧悇鏂圭殑韬唤锛屼负绀句細鍚勭晫鎻愪緵鍏銆佽瘹淇＄殑濂緢鍝侀壌瀹氬強鍩硅鏈嶅姟銆?
            </span>
          </p>
          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;涓闆嗗洟濂緢鍝侀壌瀹氫腑蹇冧笌涓闆嗗洟婧簮鎶€鏈湇鍔℃湁闄愬叕鍙稿叡鍚屾墦閫犱簡涓濂緢鍝侀壌瀹氭函婧愰槻浼郴缁燂紝鍚戝鐣屾寮忔帹鍑哄ア渚堝搧閴村畾婧簮闃蹭吉鏈嶅姟銆傝绯荤粺搴旂敤鈥滀竴鍝侊紙鐗╋級涓€鐮佲€濇函婧愪笓鍒╅槻浼妧鏈紝閫氳繃鎵竴鎵紝灏辫兘闅忔椂浜嗚В濂緢鍝侀壌瀹氫俊鎭紝鐪熸鍋氬埌閴村畾婧簮闃蹭吉涓€浣撳寲锛屼负濂緢鍝佸競鍦轰繚椹炬姢鑸€傜粡杩囬壌瀹氭函婧愮殑濂緢鍝侀兘浼氭湁涓涓ア涓績鈥滈壌瀹氭函婧怚D韬唤璇佲€濓紝鈥滈獙鏄庢韬€濈殑鍚屾椂锛屾彁鍗囨秷璐逛綋楠岋紝璁╂秷璐硅€呰喘鐗╂洿鏀惧績銆?
            </span>
          </p>
          <p>
            <span style={descriptionStyle}>
              &nbsp; &nbsp; &nbsp; &nbsp;
              <span style={{ color: "rgb(227, 108, 9)", fontFamily: '寰蒋闆呴粦, "Microsoft YaHei"' }}>
                <strong>鑱旂郴鐢佃瘽锛?10-58619556&nbsp;</strong>
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
              />
              <img
                src={companyImageB}
                title="1666591971967015074.jpg"
                alt=""
                style={richImageStyle}
                onClick={() => onPreview(companyImageB)}
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
            />
            <img
              src={companyImageE}
              title="1590048848871028263.jpg"
              alt=""
              style={richImageStyle}
              onClick={() => onPreview(companyImageE)}
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
