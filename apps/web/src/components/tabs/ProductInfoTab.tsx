import React from "react";

const paragraphStyle = {
  marginTop: "5px",
  marginRight: 0,
  marginBottom: "5px",
  marginLeft: 0,
  textIndent: 0,
  lineHeight: "24px",
} as const;

interface ProductInfoTabProps {
  consignorName: string;
  verificationDate: string;
  conclusion?: string;
}

export function ProductInfoTab({ consignorName, verificationDate, conclusion }: ProductInfoTabProps) {
  return (
    <div className="richTextContent app-richtext" id="richtext" style={{ display: "block" }}>
      <p style={paragraphStyle} id="dddd">
        <strong>
          {"委托单位："}
          {consignorName || "-"}
          <br />
          {"核验日期："}
          {verificationDate || "-"}
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {"检验结论："}
          {conclusion || "送检样品符合品牌方商品外观工艺特征。"}
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "备注：1、检验结果仅对送检样品负责，若标签损毁、标签涂改，显示内容无效；"
          }
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "2、若对显示的内容和结论持有异议，需在检验日期后15日内提出，逾期不予受理；"
          }
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "3、品牌方为商品的设计及制造方，如品牌方确认该鉴定样品为品牌方制造及销售商品，以品牌方的结论为准；"
          }
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "4、客户信息及样品均由委托单位提供，检验结果不涉及样品品质检测等信息。"
          }
        </strong>
      </p>
    </div>
  );
}
