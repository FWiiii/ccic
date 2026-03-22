import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InspectionResultClient } from "../InspectionResultClient";

describe("InspectionResultClient", () => {
  it("switches tabs and opens the preview modal", async () => {
    render(
      <InspectionResultClient
        bannerImages={["https://img.example.com/a.jpg"]}
        traceSampleImages={["https://img.example.com/a.jpg"]}
        productName="测试包"
        inspectionAgencyName="中检"
        consignorName="测试公司"
        verificationDate="2026-03-22"
        conclusion="通过"
        currentTraceStatus="COMPLETED"
      />
    );

    fireEvent.click(screen.getByText("追溯信息"));
    expect(screen.getByText("样品信息")).toBeInTheDocument();

    fireEvent.click(document.querySelector(".app-carousel-image") as HTMLImageElement);
    expect(screen.getByAltText("preview")).toBeInTheDocument();
  });
});
