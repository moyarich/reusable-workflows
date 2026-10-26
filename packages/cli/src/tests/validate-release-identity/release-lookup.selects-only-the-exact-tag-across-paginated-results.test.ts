import { describe, expect, it } from "vitest";
import { findReleaseByTag } from "../../validate-release-identity/release-lookup.ts";

describe("pure GitHub release lookup", () => {
  const response = JSON.stringify([
    [{ tag_name: "v1.0.0", body: "Old notes" }],
    [{ tag_name: "v1.1.0", body: "Current notes" }],
  ]);
  it("selects only the exact tag across paginated results", () => {
    expect(findReleaseByTag(response, "v1.1.0")?.body).toBe("Current notes");
    expect(findReleaseByTag(response, "v1.1")).toBeUndefined();
  });
});
