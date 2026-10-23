import { describe, expect, it } from "vitest";
import { findReleaseByTag } from "../packages/cli/src/validate-release-identity/release-lookup.ts";

describe("pure GitHub release lookup", () => {
  const response = JSON.stringify([
    [{ tag_name: "v1.0.0", body: "Old notes" }],
    [{ tag_name: "v1.1.0", body: "Current notes" }],
  ]);
  it("selects only the exact tag across paginated results", () => {
    expect(findReleaseByTag(response, "v1.1.0")?.body).toBe("Current notes");
    expect(findReleaseByTag(response, "v1.1")).toBeUndefined();
  });
  it("does not match malformed records", () => {
    expect(
      findReleaseByTag(JSON.stringify([[null, "v1.1.0", {}]]), "v1.1.0"),
    ).toBeUndefined();
  });
  it("rejects unexpected API result formats", () => {
    expect(() => findReleaseByTag("{}", "v1.1.0")).toThrow(/array/);
  });
});
