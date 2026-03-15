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
        <strong>{"\u5907\u6ce8\uff1a1\u3001\u68c0\u9a8c\u7ed3\u679c\u4ec5\u5bf9\u9001\u68c0\u6837\u54c1\u8d1f\u8d23\uff1b"}</strong>
      </p>

      <p style={paragraphStyle}>
        <strong>
          {"2\u3001\u82e5\u5bf9\u7ed3\u8bba\u6709\u5f02\u8bae\uff0c\u8bf7\u5728\u68c0\u9a8c\u65e5\u671f\u540e15\u65e5\u5185\u63d0\u51fa\uff1b"}
        </strong>
      </p>

      <p style={paragraphStyle}>
        <strong>{"3\u3001\u54c1\u724c\u65b9\u7ed3\u8bba\u4f18\u5148\uff1b"}</strong>
      </p>

      <p style={paragraphStyle}>
        <strong>{"4\u3001\u68c0\u9a8c\u7ed3\u679c\u4e0d\u6d89\u53ca\u54c1\u8d28\u68c0\u6d4b\u3002"}</strong>
      </p>
    </div>
  );
}
