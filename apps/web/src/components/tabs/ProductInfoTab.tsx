interface ProductInfoTabProps {
  productInfoHtml?: string;
  consignorName?: string;
  inspectionDate?: string;
  conclusion?: string;
  notes?: string[];
  rawHtml?: string;
}

const paragraphStyle = {
  marginTop: "5px",
  marginRight: 0,
  marginBottom: "5px",
  marginLeft: 0,
  textIndent: 0,
  lineHeight: "24px",
} as const;

const fallbackNotes = [
  "1、检验结果仅对送检样品负责，若标签损坏、涂改，显示内容无效。",
  "2、若对显示内容和结论持有异议，需在检验日期后15日内提出。",
  "3、如品牌方确认该样品为品牌方制造销售商品，以品牌方结论为准。",
  "4、客户信息及样品由委托单位提供，检验结果不涉及样品品质检测等信息。",
];

export function ProductInfoTab({
  productInfoHtml,
  consignorName,
  inspectionDate,
  conclusion,
  notes,
  rawHtml,
}: ProductInfoTabProps) {
  const htmlContent = rawHtml || productInfoHtml;
  const noteList = notes && notes.length > 0 ? notes : fallbackNotes;

  return (
    <div className="richTextContent app-richtext" id="richtext" style={{ display: "block" }}>
      {htmlContent ? (
        <div dangerouslySetInnerHTML={{ __html: htmlContent }}></div>
      ) : (
        <>
          <p style={paragraphStyle} id="dddd">
            <strong>
              委托单位：{consignorName || "港城国际"}
              <br />
              核验日期：{inspectionDate || "2026-1-30"}
            </strong>
          </p>

          <p style={paragraphStyle}>
            <strong>检验结论：{conclusion || "送检样品符合品牌方商品外观工艺特征。"}</strong>
          </p>

          {noteList.map((note, index) => (
            <p style={paragraphStyle} key={`${index}-${note}`}>
              <strong>{note}</strong>
            </p>
          ))}
        </>
      )}
    </div>
  );
}
