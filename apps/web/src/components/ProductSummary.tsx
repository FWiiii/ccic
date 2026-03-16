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
            <span className="n-product-name">{"产品名称"}</span>
            <span className="n-name-content productname">{productName || "-"}</span>
          </div>
        </div>
        <div>
          <div className="baccol-span1">
            <span className="n-enterprise-name">{"检验机构"}</span>
            <span className="n-name-content companyNameImg">{inspectionAgencyName || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
