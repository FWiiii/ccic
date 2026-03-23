import { describe, expect, it } from "vitest";
import { resolveSearchValidationResult } from "../search-validation";

describe("search-validation", () => {
  it("returns invalid for any non-empty input during placeholder mode", () => {
    expect(resolveSearchValidationResult("1234")).toBe("invalid");
    expect(resolveSearchValidationResult("9999")).toBe("invalid");
  });
});
