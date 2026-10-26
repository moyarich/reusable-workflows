import { describe, expect, it } from "vitest";
import { findReleaseByTag } from "../../validate-release-identity/release-lookup.ts";
describe("pure GitHub release lookup", () => {
  it("rejects unexpected API result formats", () => {
    expect(() => findReleaseByTag("{}", "v1.1.0")).toThrow(/array/);
  });
});
