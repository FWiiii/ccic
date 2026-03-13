interface ProductSummaryProps {
  productName?: string;
  companyName?: string;
}

export function ProductSummary({ productName, companyName }: ProductSummaryProps) {
  return (
    <div className="baccol">
      <div className="baccol-div">
        <div className="baccol-cdiv">
          <div className="baccol-span">
            <span className="n-product-name">浜у搧鍚嶇О</span>
            <span className="n-name-content productname">{productName || "LOUIS VUITTON/璺槗濞佺櫥"}</span>
          </div>
        </div>
        <div>
          <div className="baccol-span1">
            <span className="n-enterprise-name">妫€楠屾満鏋?</span>
            <span className="n-name-content companyNameImg">
              {companyName || "涓浗妫€楠岃璇侀泦鍥㈠ア渚堝搧閴村畾涓績"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
