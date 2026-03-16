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
          {"\u59d4\u6258\u5355\u4f4d\uff1a"}
          {consignorName || "-"}
          <br />
          {"\u6838\u9a8c\u65e5\u671f\uff1a"}
          {verificationDate || "-"}
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {"\u68c0\u9a8c\u7ed3\u8bba\uff1a"}
          {conclusion || "\u9001\u68c0\u6837\u54c1\u7b26\u5408\u54c1\u724c\u65b9\u5546\u54c1\u5916\u89c2\u5de5\u827a\u7279\u5f81\u3002"}
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "\u5907\u6ce8\uff1a1\u3001\u68c0\u9a8c\u7ed3\u679c\u4ec5\u5bf9\u9001\u68c0\u6837\u54c1\u8d1f\u8d23\uff0c\u82e5\u6807\u7b7e\u635f\u6bc1\u3001\u6807\u7b7e\u6d82\u6539\uff0c\u663e\u793a\u5185\u5bb9\u65e0\u6548\uff1b"
          }
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "2\u3001\u82e5\u5bf9\u663e\u793a\u7684\u5185\u5bb9\u548c\u7ed3\u8bba\u6301\u6709\u5f02\u8bae\uff0c\u9700\u5728\u68c0\u9a8c\u65e5\u671f\u540e15\u65e5\u5185\u63d0\u51fa\uff0c\u903e\u671f\u4e0d\u4e88\u53d7\u7406\uff1b"
          }
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "3\u3001\u54c1\u724c\u65b9\u4e3a\u5546\u54c1\u7684\u8bbe\u8ba1\u53ca\u5236\u9020\u65b9\uff0c\u5982\u54c1\u724c\u65b9\u786e\u8ba4\u8be5\u9274\u5b9a\u6837\u54c1\u4e3a\u54c1\u724c\u65b9\u5236\u9020\u53ca\u9500\u552e\u5546\u54c1\uff0c\u4ee5\u54c1\u724c\u65b9\u7684\u7ed3\u8bba\u4e3a\u51c6\uff1b"
          }
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {
            "4\u3001\u5ba2\u6237\u4fe1\u606f\u53ca\u6837\u54c1\u5747\u7531\u59d4\u6258\u5355\u4f4d\u63d0\u4f9b\uff0c\u68c0\u9a8c\u7ed3\u679c\u4e0d\u6d89\u53ca\u6837\u54c1\u54c1\u8d28\u68c0\u6d4b\u7b49\u4fe1\u606f\u3002"
          }
        </strong>
      </p>
    </div>
  );
}
