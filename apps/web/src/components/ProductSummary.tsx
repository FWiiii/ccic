interface ProductSummaryProps {
  productName: string;
  inspectionAgencyName: string;
  isLoading?: boolean;
}

export function ProductSummary({ productName, inspectionAgencyName, isLoading = false }: ProductSummaryProps) {
  return (
    <div className="baccol">
      <div className="baccol-div">
        <div className="baccol-cdiv">
          <div className="baccol-span">
            <span className="n-product-name">{"产品名称"}</span>
            {isLoading ? (
              <span className="app-inline-skeleton app-inline-skeleton--name" aria-hidden="true"></span>
            ) : (
              <span className="n-name-content productname">{productName || "-"}</span>
            )}
          </div>
        </div>
        <div>
          <div className="baccol-span1">
            <span className="n-enterprise-name">{"检验机构"}</span>
            {isLoading ? (
              <span className="app-inline-skeleton app-inline-skeleton--agency" aria-hidden="true"></span>
            ) : (
              <span className="n-name-content companyNameImg">{inspectionAgencyName || "-"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
