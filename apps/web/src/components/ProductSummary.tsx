interface ProductSummaryProps {
  productName: string;
  inspectionAgencyName: string;
}

export function ProductSummary({ productName, inspectionAgencyName }: ProductSummaryProps) {
  return (
    <div className="baccol">
      <div className="baccol-div">
        <div className="baccol-cdiv">
          <div className="baccol-span">
            <span className="n-product-name">{"\u4ea7\u54c1\u540d\u79f0"}</span>
            <span className="n-name-content productname">{productName || "-"}</span>
          </div>
        </div>
        <div>
          <div className="baccol-span1">
            <span className="n-enterprise-name">{"\u68c0\u9a8c\u673a\u6784"}</span>
            <span className="n-name-content companyNameImg">{inspectionAgencyName || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
