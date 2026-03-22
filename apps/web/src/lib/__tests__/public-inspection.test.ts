import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicInspectionRequestError, fetchPublicInspectionBySn } from "../public-inspection";

describe("fetchPublicInspectionBySn", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns payload data when the API returns 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { inspectionAgencyName: "CCIC", inspection: {}, product: { images: [] }, company: {} } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await fetchPublicInspectionBySn("SN001", { runtime: "server", internalBaseUrl: "http://127.0.0.1:4000" });
    expect(result.inspectionAgencyName).toBe("CCIC");
  });

  it("throws a typed 404 error for missing inspections", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Inspection not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      fetchPublicInspectionBySn("SN404", { runtime: "server", internalBaseUrl: "http://127.0.0.1:4000" })
    ).rejects.toEqual(expect.objectContaining<Partial<PublicInspectionRequestError>>({ status: 404 }));
  });

  it("throws a typed non-404 error for upstream failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Upstream exploded" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      fetchPublicInspectionBySn("SN500", { runtime: "server", internalBaseUrl: "http://127.0.0.1:4000" })
    ).rejects.toEqual(expect.objectContaining<Partial<PublicInspectionRequestError>>({ status: 500 }));
  });
});
