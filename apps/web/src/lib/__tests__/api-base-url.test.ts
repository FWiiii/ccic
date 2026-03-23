import { describe, expect, it } from "vitest";

import { buildPublicInspectionPath, buildPublicInspectionUrl, resolveInternalApiBaseUrl } from "../api-base-url";

describe("api-base-url", () => {
  it("returns relative path on client when NEXT_PUBLIC_API_BASE_URL is empty", () => {
    expect(buildPublicInspectionUrl("SN/123", { runtime: "client", publicBaseUrl: "" })).toBe(
      "/api/v1/public/inspection?sn=SN%2F123"
    );
  });

  it("requires server internal base URL", () => {
    expect(() => resolveInternalApiBaseUrl("")).toThrowError(
      "INTERNAL_API_BASE_URL is required for server-side inspection requests."
    );
  });

  it("normalizes trailing slash for server requests", () => {
    expect(
      buildPublicInspectionUrl("abc", { runtime: "server", internalBaseUrl: "http://127.0.0.1:4000/" })
    ).toBe(`${resolveInternalApiBaseUrl("http://127.0.0.1:4000")}${buildPublicInspectionPath("abc")}`);
  });
});
