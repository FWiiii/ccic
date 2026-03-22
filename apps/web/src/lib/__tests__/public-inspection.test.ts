import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicInspectionRequestError, fetchPublicInspectionBySn } from "../public-inspection";

describe("fetchPublicInspectionBySn", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:4000/api/v1/public/inspection?sn=SN001", { cache: "no-store" });
  });

  it("builds the client runtime URL and requests with no-store cache", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { inspectionAgencyName: "CCIC", inspection: {}, product: { images: [] }, company: {} },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await fetchPublicInspectionBySn("SN002", {
      runtime: "client",
      publicBaseUrl: "https://public.example.com/",
    });

    expect(fetch).toHaveBeenCalledWith("https://public.example.com/api/v1/public/inspection?sn=SN002", {
      cache: "no-store",
    });
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

  it("throws a typed error with sentinel status for transport failures", async () => {
    const cause = new TypeError("network down");
    vi.mocked(fetch).mockRejectedValueOnce(cause);

    await expect(
      fetchPublicInspectionBySn("SNNET", { runtime: "server", internalBaseUrl: "http://127.0.0.1:4000" })
    ).rejects.toEqual(
      expect.objectContaining<Partial<PublicInspectionRequestError>>({
        status: 0,
        cause,
      })
    );
  });
});
