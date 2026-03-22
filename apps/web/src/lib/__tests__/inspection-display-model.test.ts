import { describe, expect, it } from "vitest";
import { buildInspectionDisplayModel } from "../inspection-display-model";

describe("buildInspectionDisplayModel", () => {
  it("normalizes duplicate and empty image urls", () => {
    const model = buildInspectionDisplayModel(
      {
        inspectionAgencyName: "",
        inspection: { status: "PUBLISHED", inspectionTime: "2026-03-22T10:00:00.000Z", result: "PASS" },
        product: { name: "测试包袋", images: [{ id: "1", url: " https://img/a.jpg " }, { id: "2", url: "https://img/a.jpg" }] },
        company: { name: "测试公司" },
        display: {},
      },
      "中检默认机构"
    );

    expect(model.bannerImages).toEqual(["https://img/a.jpg"]);
    expect(model.inspectionAgencyName).toBe("中检默认机构");
  });

  it("formats the verification date and trace status from the inspection payload", () => {
    const model = buildInspectionDisplayModel(
      {
        inspectionAgencyName: "中检",
        inspection: { status: "REVIEWED", inspectionTime: "2026/3/2", result: "PASS" },
        product: { name: "测试包袋", images: [] },
        company: { name: "测试公司" },
        display: {},
      },
      "中检默认机构"
    );

    expect(model.verificationDate).toBe("2026-03-02");
    expect(model.currentTraceStatus).toBe("INSPECTING");
  });
});
