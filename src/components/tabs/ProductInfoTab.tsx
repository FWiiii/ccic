const paragraphStyle = {
  marginTop: "5px",
  marginRight: 0,
  marginBottom: "5px",
  marginLeft: 0,
  textIndent: 0,
  lineHeight: "24px",
} as const;

export function ProductInfoTab() {
  return (
    <div className="richTextContent app-richtext" id="richtext" style={{ display: "block" }}>
      <p style={paragraphStyle} id="dddd">
        <strong>
          濮旀墭鍗曚綅锛氭腐鍩庡浗闄?<br />鏍搁獙鏃ユ湡锛?026-1-30
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>妫€楠岀粨璁猴細閫佹鏍峰搧绗﹀悎鍝佺墝鏂瑰晢鍝佸瑙傚伐鑹虹壒寰併€?</strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          澶囨敞锛?銆佹楠岀粨鏋滀粎瀵归€佹鏍峰搧璐熻矗锛岃嫢鏍囩鎹熸瘉銆佹爣绛炬秱鏀癸紝鏄剧ず鍐呭鏃犳晥锛?
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          2銆佽嫢瀵规樉绀虹殑鍐呭鍜岀粨璁烘寔鏈夊紓璁紝闇€鍦ㄦ楠屾棩鏈熷悗15鏃ュ唴鎻愬嚭锛岄€炬湡涓嶄簣鍙楃悊锛?
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          3銆佸搧鐗屾柟涓哄晢鍝佺殑璁捐鍙婂埗閫犳柟锛屽鍝佺墝鏂圭‘璁よ閴村畾鏍峰搧涓哄搧鐗屾柟鍒堕€犲強閿€鍞晢鍝侊紝浠ュ搧鐗屾柟鐨勭粨璁轰负鍑嗭紱
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          4銆佸鎴蜂俊鎭強鏍峰搧鍧囩敱濮旀墭鍗曚綅鎻愪緵锛屾楠岀粨鏋滀笉娑夊強鏍峰搧鍝佽川妫€娴嬬瓑淇℃伅銆?
        </strong>
      </p>
    </div>
  );
}
